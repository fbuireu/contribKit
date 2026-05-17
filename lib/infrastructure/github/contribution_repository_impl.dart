import 'dart:async';
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
import 'package:contribkit/infrastructure/github/graphql_client.dart';
import 'package:hive_flutter/hive_flutter.dart';

const _cacheBoxName = 'contribution_cache';

/// Implementation of [ContributionRepository] backed by the GitHub GraphQL API
/// with Hive-based caching.
///
/// Past years are cached forever (they never change).
/// The current year is cached for 1 hour.
final class GitHubContributionRepository implements ContributionRepository {
  GitHubContributionRepository({required GraphQLClient graphQLClient})
      : _client = graphQLClient;

  final GraphQLClient _client;

  static const _currentYearTtl = Duration(hours: 1);

  static const _query = r'''
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
                color
              }
            }
          }
        }
      }
    }
  ''';

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
    try {
      final from = DateTime.utc(year.value, 1, 1).toIso8601String();
      final to = DateTime.utc(year.value, 12, 31, 23, 59, 59).toIso8601String();

      final data = await _client.query(
        query: _query,
        variables: {'login': username.value, 'from': from, 'to': to},
      );

      final user = data['user'];
      if (user == null) {
        throw NotFoundFailure(username: username.value);
      }

      final userMap = user as Map<String, dynamic>;
      final collection =
          userMap['contributionsCollection'] as Map<String, dynamic>;
      final calendarJson =
          collection['contributionCalendar'] as Map<String, dynamic>;

      final dto = ContributionCalendarDto.fromJson(calendarJson);
      return _toDomain(dto, username, year);
    } on GitHubApiException catch (e) {
      if (e.type == 'NOT_FOUND') {
        throw NotFoundFailure(username: username.value);
      }
      if (e.type == 'RATE_LIMITED') {
        throw const RateLimitedFailure();
      }
      throw NetworkFailure(message: e.message);
    } on Failure {
      rethrow;
    } catch (e) {
      throw NetworkFailure(message: e.toString());
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
    final yearMax = allCounts.isEmpty ? 0 : allCounts.reduce((a, b) => a > b ? a : b);

    final weeks = dto.weeks.map((weekDto) {
      final days = weekDto.contributionDays.map((dayDto) {
        final date = DateTime.parse(dayDto.date);
        final count = dayDto.contributionCount;
        final level = ContributionLevelService.levelFor(
          count: count,
          yearMax: yearMax,
        );
        return ContributionDay(date: date, count: count, level: level);
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
