import 'dart:convert';
import 'dart:io';

import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/entities/contribution_day.dart';
import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/repositories/contribution_repository.dart';
import 'package:contribkit/domain/services/contribution_grid_service.dart';
import 'package:contribkit/domain/services/contribution_level_service.dart';
import 'package:contribkit/domain/services/contribution_stats_service.dart';
import 'package:contribkit/domain/value_objects/calendar_date.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/infrastructure/github/dtos/contribution_calendar_dto.dart';
import 'package:contribkit/infrastructure/http/request_timeout.dart';
import 'package:contribkit/infrastructure/http/retry_after.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:http/http.dart' as http;

const _cacheBoxName = 'contribution_cache_v3';
const legacyContributionCacheBoxNames = <String>[
  'contribution_cache',
  'contribution_cache_v2',
];

final class GitHubContributionRepository implements ContributionRepository {
  GitHubContributionRepository({
    http.Client? httpClient,
    DateTime Function()? now,
  }) : _httpClient = httpClient ?? http.Client(),
       _ownsClient = httpClient == null,
       _now = now ?? DateTime.now;

  final http.Client _httpClient;
  final bool _ownsClient;
  final DateTime Function() _now;

  void close() {
    if (_ownsClient) _httpClient.close();
  }

  static const _currentYearTtl = Duration(hours: 1);

  static final _tdRegex = RegExp(r'<td\b[^>]*ContributionCalendar-day[^>]*>');
  static final _idAttr = RegExp(r'\bid="([^"]+)"');
  static final _dateAttr = RegExp(r'\bdata-date="(\d{4}-\d{2}-\d{2})"');
  static final _levelAttr = RegExp(r'\bdata-level="(\d)"');
  static final _tooltipRegex = RegExp(
    r'<tool-tip\b[^>]*for="([^"]+)"[^>]*>([^<]+)</tool-tip>',
  );
  static final _countPrefix = RegExp(r'^([\d,  ]+)');
  static final _countSeparators = RegExp(r'[,  ]');

  @override
  Future<({ContributionCalendar calendar, bool fromCache})> fetchCalendar({
    required Username username,
    required Year year,
  }) async {
    final cacheKey = _cacheKeyFor(username: username, year: year);
    final cached = await _readCache(
      key: cacheKey,
      username: username,
      year: year,
    );
    if (cached != null) return (calendar: cached, fromCache: true);

    final data = await _fetch(username: username, year: year);
    await _writeCache(key: cacheKey, calendar: data);
    return (calendar: data, fromCache: false);
  }

  static String _cacheKeyFor({
    required Username username,
    required Year year,
  }) => '${username.value.toLowerCase()}:${year.value}';

  @override
  Future<void> invalidateCache(Username username) async {
    try {
      final box = await _openBox();
      final keys = box.keys
          .whereType<String>()
          .where((k) => k.startsWith('${username.value.toLowerCase()}:'))
          .toList();
      await box.deleteAll(keys);
    } catch (e) {
      throw CacheFailure(message: e.toString());
    }
  }

  Future<ContributionCalendar> _fetch({
    required Username username,
    required Year year,
  }) async {
    final uri = Uri.parse(
      'https://github.com/users/${username.value}/contributions'
      '?from=${year.value}-01-01&to=${year.value}-12-31',
    );
    final http.Response response;
    try {
      response = await _httpClient
          .get(
            uri,
            headers: {
              'User-Agent': 'ContribKit/1.0 (Flutter)',
              'Accept': 'text/html',
            },
          )
          .timeout(RequestTimeout.duration, onTimeout: RequestTimeout.expired);
    } on IOException catch (e) {
      throw NetworkFailure(message: e.toString());
    } on http.ClientException catch (e) {
      throw NetworkFailure(message: e.toString());
    }
    if (response.statusCode == 404) {
      throw NotFoundFailure(username: username);
    }
    if (response.statusCode == 429) {
      throw RateLimitedFailure(
        resetAt: RetryAfter.resetAtFrom(response.headers, now: _now()),
      );
    }
    if (response.statusCode != 200) {
      throw UpstreamFailure(message: 'HTTP ${response.statusCode}');
    }

    return _parseHtml(html: response.body, username: username, year: year);
  }

  ContributionCalendar _parseHtml({
    required String html,
    required Username username,
    required Year year,
  }) {
    final parsed = <({DateTime date, int? level, String? id})>[];
    for (final tdMatch in _tdRegex.allMatches(html)) {
      final td = tdMatch.group(0)!;
      final dateMatch = _dateAttr.firstMatch(td);
      if (dateMatch == null) continue;

      final date = CalendarDate.tryParse(dateMatch.group(1)!);
      if (date == null || date.year != year.value) continue;

      final levelMatch = _levelAttr.firstMatch(td);
      parsed.add((
        date: date,
        level: levelMatch == null ? null : int.tryParse(levelMatch.group(1)!),
        id: _idAttr.firstMatch(td)?.group(1),
      ));
    }

    if (parsed.isEmpty) {
      throw const ParseFailure(message: 'Could not parse contributions');
    }

    final idToCount = <String, int>{};
    for (final tooltipMatch in _tooltipRegex.allMatches(html)) {
      final forId = tooltipMatch.group(1)!;
      final text = tooltipMatch.group(2)!.trim();
      final numMatch = _countPrefix.firstMatch(text);
      final count = numMatch == null
          ? null
          : int.tryParse(numMatch.group(1)!.replaceAll(_countSeparators, ''));
      if (count != null) idToCount[forId] = count;
    }

    final rawDays =
        parsed
            .map(
              (d) => (
                date: d.date,
                level: d.level,
                count: d.id == null ? null : idToCount[d.id],
              ),
            )
            .toList()
          ..sort((a, b) => a.date.compareTo(b.date));

    final yearMax = ContributionLevelService.highestCount(
      rawDays.map((d) => d.count),
    );

    final days = rawDays
        .map(
          (d) => ContributionDay(
            date: d.date,
            count: d.count,
            level: ContributionLevelService.levelOf(
              storedIndex: d.level,
              count: d.count,
              yearMax: yearMax,
            ),
          ),
        )
        .toList();

    return ContributionCalendar(
      username: username,
      year: year,
      weeks: ContributionGridService.buildFor(days: days, year: year.value),
      totalContributions: ContributionStatsService.totalFor(days),
    );
  }

  Future<ContributionCalendar?> _readCache({
    required String key,
    required Username username,
    required Year year,
  }) async {
    try {
      final box = await _openBox();
      final raw = box.get(key) as Map<dynamic, dynamic>?;
      if (raw == null) return null;

      final cachedAt = DateTime.parse(raw['cachedAt'] as String);
      final writtenAfterYearEnded = cachedAt.isAfter(DateTime(year.value + 1));

      if (!writtenAfterYearEnded) {
        final age = _now().difference(cachedAt);
        if (age > _currentYearTtl) return null;
      }

      final dto = ContributionCalendarDto.fromJson(
        jsonDecode(raw['json'] as String) as Map<String, dynamic>,
      );
      return _toDomain(dto: dto, username: username, year: year);
    } catch (_) {
      return null;
    }
  }

  Future<void> _writeCache({
    required String key,
    required ContributionCalendar calendar,
  }) async {
    try {
      final box = await _openBox();
      final dto = _toDto(calendar);
      await box.put(key, {
        'cachedAt': _now().toIso8601String(),
        'json': jsonEncode(dto),
      });
    } catch (_) {}
  }

  ContributionCalendar _toDomain({
    required ContributionCalendarDto dto,
    required Username username,
    required Year year,
  }) {
    final dtoDays = dto.weeks
        .expand((weekDto) => weekDto.contributionDays)
        .toList();
    final yearMax = ContributionLevelService.highestCount(
      dtoDays.map((dayDto) => dayDto.contributionCount),
    );

    final days = dtoDays
        .map(
          (dayDto) => ContributionDay(
            date: CalendarDate.parse(dayDto.date),
            count: dayDto.contributionCount,
            level: ContributionLevelService.levelOf(
              storedIndex: dayDto.level,
              count: dayDto.contributionCount,
              yearMax: yearMax,
            ),
          ),
        )
        .toList();
    final weeks = ContributionGridService.buildFor(
      days: days,
      year: year.value,
    );

    return ContributionCalendar(
      username: username,
      year: year,
      weeks: weeks,
      totalContributions: dto.totalContributions,
    );
  }

  ContributionCalendarDto _toDto(ContributionCalendar calendar) =>
      ContributionCalendarDto(
        totalContributions: calendar.totalContributions,
        weeks: calendar.weeks
            .map(
              (week) => ContributionWeekDto(
                contributionDays: week.days
                    .map(
                      (day) => ContributionDayDto(
                        date: day.date.toIso8601String().substring(0, 10),
                        contributionCount: day.count,
                        level: day.level.index,
                      ),
                    )
                    .toList(),
              ),
            )
            .toList(),
      );

  Future<Box<dynamic>> _openBox() => Hive.openBox<dynamic>(_cacheBoxName);
}
