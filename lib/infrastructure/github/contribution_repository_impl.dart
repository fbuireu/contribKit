import 'dart:convert';

import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/entities/contribution_day.dart';
import 'package:contribkit/domain/entities/contribution_week.dart';
import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/repositories/contribution_repository.dart';
import 'package:contribkit/domain/services/contribution_level_service.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/infrastructure/github/dtos/contribution_calendar_dto.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:http/http.dart' as http;

const _cacheBoxName = 'contribution_cache';

final class GitHubContributionRepository implements ContributionRepository {
  GitHubContributionRepository({http.Client? httpClient})
    : _httpClient = httpClient ?? http.Client();

  final http.Client _httpClient;

  static const _currentYearTtl = Duration(hours: 1);

  // GitHub renders contributions as <td class="ContributionCalendar-day">
  // with a sibling <tool-tip> containing the count in plain text.
  static final _tdRegex = RegExp(
    r'<td\b[^>]*class="ContributionCalendar-day"[^>]*>',
  );
  static final _idAttr = RegExp(r'\bid="([^"]+)"');
  static final _dateAttr = RegExp(r'\bdata-date="([^"]+)"');
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
    final box = await _openBox();
    final keys = box.keys
        .whereType<String>()
        .where((k) => k.startsWith('${username.value}:'))
        .toList();
    await box.deleteAll(keys);
  }

  Future<ContributionCalendar> _fetch(Username username, Year year) async {
    final uri = Uri.parse(
      'https://github.com/users/${username.value}/contributions'
      '?from=${year.value}-01-01&to=${year.value}-12-31',
    );

    try {
      final response = await _httpClient.get(
        uri,
        headers: {
          'User-Agent': 'ContribKit/1.0 (Flutter)',
          'Accept': 'text/html',
          'X-Requested-With': 'XMLHttpRequest',
        },
      );

      if (response.statusCode == 404) {
        throw NotFoundFailure(username: username.value);
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

  ContributionCalendar _parseHtml(String html, Username username, Year year) {
    // Pass 1: id → date from <td class="ContributionCalendar-day">
    final idToDate = <String, DateTime>{};
    for (final tdMatch in _tdRegex.allMatches(html)) {
      final td = tdMatch.group(0)!;
      final idMatch = _idAttr.firstMatch(td);
      final dateMatch = _dateAttr.firstMatch(td);
      if (idMatch == null || dateMatch == null) continue;

      final date = DateTime.tryParse(dateMatch.group(1)!);
      if (date == null || date.year != year.value) continue;

      idToDate[idMatch.group(1)!] = date;
    }

    if (idToDate.isEmpty) throw NotFoundFailure(username: username.value);

    // Pass 2: id → count from <tool-tip for="...">N contribution(s)…</tool-tip>
    final idToCount = <String, int>{};
    for (final tipMatch in _tooltipRegex.allMatches(html)) {
      final forId = tipMatch.group(1)!;
      final text = tipMatch.group(2)!.trim();
      final numMatch = _countPrefix.firstMatch(text);
      idToCount[forId] = numMatch != null
          ? (int.tryParse(numMatch.group(1)!) ?? 0)
          : 0;
    }

    final rawDays =
        idToDate.entries
            .map((e) => (date: e.value, count: idToCount[e.key] ?? 0))
            .toList()
          ..sort((a, b) => a.date.compareTo(b.date));

    final yearMax = rawDays.fold(0, (max, d) => d.count > max ? d.count : max);

    final days = rawDays
        .map(
          (d) => ContributionDay(
            date: d.date,
            count: d.count,
            level: ContributionLevelService.levelFor(
              count: d.count,
              yearMax: yearMax,
            ),
          ),
        )
        .toList();

    return ContributionCalendar(
      username: username,
      year: year,
      weeks: _groupIntoWeeks(days),
      totalContributions: rawDays.fold(0, (s, d) => s + d.count),
    );
  }

  /// Groups sorted days into calendar weeks starting on Sunday.
  List<ContributionWeek> _groupIntoWeeks(List<ContributionDay> days) {
    final weeks = <ContributionWeek>[];
    var current = <ContributionDay>[];

    for (final day in days) {
      if (current.isNotEmpty && day.date.weekday == DateTime.sunday) {
        weeks.add(ContributionWeek(days: current));
        current = [];
      }
      current.add(day);
    }
    if (current.isNotEmpty) weeks.add(ContributionWeek(days: current));

    return weeks;
  }

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
    } catch (_) {
      // Cache write failures are non-fatal.
    }
  }

  ContributionCalendar _toDomain(
    ContributionCalendarDto dto,
    Username username,
    Year year,
  ) {
    final allCounts = dto.weeks
        .expand((w) => w.contributionDays)
        .map((d) => d.contributionCount)
        .toList();
    final yearMax = allCounts.isEmpty
        ? 0
        : allCounts.reduce((a, b) => a > b ? a : b);

    final weeks = dto.weeks.map((weekDto) {
      final days = weekDto.contributionDays.map((dayDto) {
        final date = DateTime.parse(dayDto.date);
        final count = dayDto.contributionCount;
        return ContributionDay(
          date: date,
          count: count,
          level: ContributionLevelService.levelFor(
            count: count,
            yearMax: yearMax,
          ),
        );
      }).toList();
      return ContributionWeek(days: days);
    }).toList();

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
                    'color': '#000000',
                  },
                )
                .toList(),
          },
        )
        .toList(),
  };

  Future<Box<dynamic>> _openBox() => Hive.openBox<dynamic>(_cacheBoxName);
}
