import 'dart:convert';
import 'dart:io';

import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/entities/contribution_day.dart';
import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/repositories/contribution_repository.dart';
import 'package:contribkit/domain/services/contribution_grid_service.dart';
import 'package:contribkit/domain/services/contribution_level_service.dart';
import 'package:contribkit/domain/value_objects/contribution_level.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/infrastructure/github/dtos/contribution_calendar_dto.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:http/http.dart' as http;

const _cacheBoxName = 'contribution_cache_v3';
const legacyContributionCacheBoxNames = <String>[
  'contribution_cache',
  'contribution_cache_v2',
];

final class GitHubContributionRepository implements ContributionRepository {
  GitHubContributionRepository({http.Client? httpClient})
    : _httpClient = httpClient ?? http.Client();

  final http.Client _httpClient;

  static const _currentYearTtl = Duration(hours: 1);

  static final _tdRegex = RegExp(r'<td\b[^>]*ContributionCalendar-day[^>]*>');
  static final _idAttr = RegExp(r'\bid="([^"]+)"');
  static final _dateAttr = RegExp(r'\bdata-date="([^"]+)"');
  static final _levelAttr = RegExp(r'\bdata-level="(\d)"');
  static final _tooltipRegex = RegExp(
    r'<tool-tip\b[^>]*for="([^"]+)"[^>]*>([^<]+)</tool-tip>',
  );
  static final _countPrefix = RegExp(r'^(\d+)');

  @override
  Future<({ContributionCalendar calendar, bool fromCache})> fetchCalendar({
    required Username username,
    required Year year,
  }) async {
    final cacheKey = '${username.value}:${year.value}';
    final cached = await _readCache(cacheKey, year);
    if (cached != null) return (calendar: cached, fromCache: true);

    final data = await _fetch(username, year);
    await _writeCache(cacheKey, data, year);
    return (calendar: data, fromCache: false);
  }

  @override
  Future<void> invalidateCache(Username username) async {
    try {
      final box = await _openBox();
      final keys = box.keys
          .whereType<String>()
          .where((k) => k.startsWith('${username.value}:'))
          .toList();
      await box.deleteAll(keys);
    } catch (e) {
      throw CacheFailure(message: e.toString());
    }
  }

  static const _timeout = Duration(seconds: 20);

  Future<ContributionCalendar> _fetch(Username username, Year year) async {
    final uri = Uri.parse(
      'https://github.com/users/${username.value}/contributions'
      '?from=${year.value}-01-01&to=${year.value}-12-31',
    );
    try {
      final response = await _httpClient
          .get(
            uri,
            headers: {
              'User-Agent': 'ContribKit/1.0 (Flutter)',
              'Accept': 'text/html',
            },
          )
          .timeout(
            _timeout,
            onTimeout: () => throw NetworkFailure(
              message: 'Request timed out after ${_timeout.inSeconds}s',
            ),
          );
      if (response.statusCode == 404) {
        throw NotFoundFailure(username: username.value);
      }
      if (response.statusCode == 429) {
        throw RateLimitedFailure(resetAt: _resetAtFrom(response.headers));
      }
      if (response.statusCode != 200) {
        throw NetworkFailure(message: 'HTTP ${response.statusCode}');
      }

      final calendar = _parseHtml(response.body, username, year);
      return calendar;
    } on Failure {
      rethrow;
    } catch (e) {
      throw NetworkFailure(message: e.toString());
    }
  }

  static DateTime? _resetAtFrom(Map<String, String> headers) {
    final retryAfter = headers['retry-after'];
    if (retryAfter == null) return null;
    final trimmed = retryAfter.trim();
    final seconds = int.tryParse(trimmed);
    if (seconds != null) return DateTime.now().add(Duration(seconds: seconds));
    try {
      return HttpDate.parse(trimmed);
    } catch (_) {
      return DateTime.tryParse(trimmed);
    }
  }

  ContributionCalendar _parseHtml(String html, Username username, Year year) {
    final idToDay = <String, ({DateTime date, int? level})>{};
    for (final tdMatch in _tdRegex.allMatches(html)) {
      final td = tdMatch.group(0)!;
      final idMatch = _idAttr.firstMatch(td);
      final dateMatch = _dateAttr.firstMatch(td);
      if (idMatch == null || dateMatch == null) continue;

      final date = DateTime.tryParse(dateMatch.group(1)!);
      if (date == null || date.year != year.value) continue;

      final levelMatch = _levelAttr.firstMatch(td);
      idToDay[idMatch.group(1)!] = (
        date: date,
        level: levelMatch == null ? null : int.tryParse(levelMatch.group(1)!),
      );
    }

    if (idToDay.isEmpty) {
      throw const ParseFailure(message: 'Could not parse contributions');
    }

    final idToCount = <String, int>{};
    for (final tooltipMatch in _tooltipRegex.allMatches(html)) {
      final forId = tooltipMatch.group(1)!;
      final text = tooltipMatch.group(2)!.trim();
      final numMatch = _countPrefix.firstMatch(text);
      final parsed = numMatch == null ? null : int.tryParse(numMatch.group(1)!);
      if (parsed != null) idToCount[forId] = parsed;
    }

    final rawDays =
        idToDay.entries
            .map(
              (e) => (
                date: e.value.date,
                level: e.value.level,
                count: idToCount[e.key],
              ),
            )
            .toList()
          ..sort((a, b) => a.date.compareTo(b.date));

    final yearMax = rawDays.fold(
      0,
      (max, d) => (d.count ?? 0) > max ? d.count! : max,
    );

    final days = rawDays
        .map(
          (d) => ContributionDay(
            date: d.date,
            count: d.count,
            level:
                _levelFromIndex(d.level) ??
                ContributionLevelService.levelFor(
                  count: d.count ?? 0,
                  yearMax: yearMax,
                ),
          ),
        )
        .toList();

    return ContributionCalendar(
      username: username,
      year: year,
      weeks: ContributionGridService.buildFor(days: days, year: year.value),
      totalContributions: _totalFor(days),
    );
  }

  static int? _totalFor(List<ContributionDay> days) {
    var total = 0;
    for (final day in days) {
      final count = day.count;
      if (count == null) {
        if (day.isActive) return null;
        continue;
      }
      total += count;
    }
    return total;
  }

  static ContributionLevel? _levelFromIndex(int? index) =>
      index != null && index >= 0 && index < ContributionLevel.values.length
      ? ContributionLevel.values[index]
      : null;

  Future<ContributionCalendar?> _readCache(String key, Year year) async {
    try {
      final box = await _openBox();
      final raw = box.get(key) as Map<dynamic, dynamic>?;
      if (raw == null) return null;

      final cachedAt = DateTime.parse(raw['cachedAt'] as String);
      final isPastYear = year.value < DateTime.now().year;

      if (!isPastYear) {
        final age = DateTime.now().difference(cachedAt);
        if (age > _currentYearTtl) return null;
      }

      final dto = ContributionCalendarDto.fromJson(
        jsonDecode(raw['json'] as String) as Map<String, dynamic>,
      );
      final parts = key.split(':');
      final username = Username(parts[0]);
      return _toDomain(dto, username, year);
    } catch (_) {
      return null;
    }
  }

  Future<void> _writeCache(
    String key,
    ContributionCalendar calendar,
    Year year,
  ) async {
    try {
      final box = await _openBox();
      final dto = _toDto(calendar);
      await box.put(key, {
        'cachedAt': DateTime.now().toIso8601String(),
        'json': jsonEncode(dto),
      });
    } catch (_) {}
  }

  ContributionCalendar _toDomain(
    ContributionCalendarDto dto,
    Username username,
    Year year,
  ) {
    final allCounts = dto.weeks
        .expand((w) => w.contributionDays)
        .map((d) => d.contributionCount)
        .whereType<int>()
        .toList();
    final yearMax = allCounts.isEmpty
        ? 0
        : allCounts.reduce((a, b) => a > b ? a : b);

    final days = dto.weeks.expand((weekDto) => weekDto.contributionDays).map((
      dayDto,
    ) {
      final count = dayDto.contributionCount;
      return ContributionDay(
        date: DateTime.parse(dayDto.date),
        count: count,
        level:
            _levelFromIndex(dayDto.level) ??
            ContributionLevelService.levelFor(
              count: count ?? 0,
              yearMax: yearMax,
            ),
      );
    }).toList();
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

  Map<String, dynamic> _toDto(ContributionCalendar calendar) => {
    'totalContributions': calendar.totalContributions,
    'weeks': calendar.weeks
        .map(
          (w) => {
            'contributionDays': w.days
                .map(
                  (d) => {
                    'date': d.date.toIso8601String().substring(0, 10),
                    'contributionCount': d.count,
                    'level': d.level.index,
                  },
                )
                .toList(),
          },
        )
        .toList(),
  };

  Future<Box<dynamic>> _openBox() => Hive.openBox<dynamic>(_cacheBoxName);
}
