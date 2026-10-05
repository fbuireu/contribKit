import 'dart:convert';
import 'dart:io';

import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/entities/contribution_day.dart';
import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/services/contribution_grid_service.dart';
import 'package:contribkit/domain/value_objects/contribution_level.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/infrastructure/github/contribution_repository_impl.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import '../../support/fixtures.dart';

String _day({
  required String id,
  required String date,
  String? level,
  String cssClass = 'ContributionCalendar-day',
}) {
  final levelAttr = level == null ? '' : ' data-level="$level"';
  return '<td class="$cssClass" id="$id" data-date="$date"$levelAttr></td>';
}

String _tooltip({required String id, required int count}) =>
    '<tool-tip for="$id">$count contributions on some day.</tool-tip>';

http.Client _clientReturning(
  String body, {
  int status = 200,
  Map<String, String> headers = const {},
}) => MockClient((_) async => http.Response(body, status, headers: headers));

List<ContributionDay> _allDays(ContributionCalendar calendar) =>
    calendar.weeks.expand((week) => week.days).toList()
      ..sort((a, b) => a.date.compareTo(b.date));

String _isoOf(ContributionDay day) =>
    day.date.toIso8601String().substring(0, 10);

ContributionDay _dayOn(ContributionCalendar calendar, {required String date}) =>
    _allDays(calendar).firstWhere((day) => _isoOf(day) == date);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final username = Username('octocat');
  final year = Year(2023, today: testToday);
  late Directory hiveDir;

  setUp(() async {
    hiveDir = await Directory.systemTemp.createTemp('contribkit_cache_test');
    Hive.init(hiveDir.path);
  });

  tearDown(() async {
    await Hive.close();
    if (hiveDir.existsSync()) await hiveDir.delete(recursive: true);
  });

  group('GitHubContributionRepository owns only the client it built', () {
    test(
      'leaves an injected client open, because the caller owns it',
      () async {
        var closed = false;
        final injected = MockClient((_) async {
          return http.Response('', 200);
        });
        final repository = GitHubContributionRepository(
          httpClient: _ClosingClient(
            inner: injected,
            onClose: () => closed = true,
          ),
        );

        repository.close();

        expect(
          closed,
          isFalse,
          reason:
              'closing a client the repository did not build would break '
              'every caller that shares one',
        );
      },
    );
  });

  group('GitHubContributionRepository parses the same HTML the web does', () {
    test(
      'clamps a data-level GitHub has never sent, rather than deriving one',
      () async {
        final html =
            _day(id: 'a', date: '2023-03-06', level: '7') +
            _day(id: 'b', date: '2023-03-07', level: '4') +
            _tooltip(id: 'a', count: 1) +
            _tooltip(id: 'b', count: 100);

        final repository = GitHubContributionRepository(
          httpClient: _clientReturning(html),
        );

        final result = await repository.fetchCalendar(
          username: username,
          year: year,
        );

        expect(
          _dayOn(result.calendar, date: '2023-03-06').level,
          ContributionLevel.veryHigh,
          reason:
              'the web clamps to veryHigh; falling back to the count gives low',
        );
      },
    );

    test(
      'drops a data-date that is not a bare ISO day, as the web does',
      () async {
        const timestamped =
            '<td class="ContributionCalendar-day" id="b" '
            'data-date="2023-03-07T00:00:00Z" data-level="3"></td>';
        final html =
            '${_day(id: 'a', date: '2023-03-06', level: '2')}$timestamped';

        final repository = GitHubContributionRepository(
          httpClient: _clientReturning(html),
        );

        final result = await repository.fetchCalendar(
          username: username,
          year: year,
        );

        expect(
          _allDays(result.calendar)
              .where((d) => d.level != ContributionLevel.none),
          hasLength(1),
        );
      },
    );

    test('reads a grouped Count in full rather than truncating it', () async {
      const grouped =
          '<tool-tip for="a">1,234 contributions on some day.</tool-tip>';
      final html = '${_day(id: 'a', date: '2023-03-06', level: '4')}$grouped';

      final repository = GitHubContributionRepository(
        httpClient: _clientReturning(html),
      );

      final result = await repository.fetchCalendar(
        username: username,
        year: year,
      );

      expect(
        _dayOn(result.calendar, date: '2023-03-06').count,
        1234,
        reason: 'truncating to 1 reports a wrong number as an exact one',
      );
    });
  });

  group('GitHubContributionRepository level derivation', () {
    test(
      'prefers GitHub data-level over a level derived from the count',
      () async {
        final html =
            _day(id: 'a', date: '2023-03-06', level: '1') +
            _day(id: 'b', date: '2023-03-07', level: '4') +
            _tooltip(id: 'a', count: 10) +
            _tooltip(id: 'b', count: 1);

        final repository = GitHubContributionRepository(
          httpClient: _clientReturning(html),
        );

        final result = await repository.fetchCalendar(
          username: username,
          year: year,
        );
        expect(_dayOn(result.calendar, date: '2023-03-06').count, 10);
        expect(
          _dayOn(result.calendar, date: '2023-03-06').level,
          ContributionLevel.low,
        );
        expect(_dayOn(result.calendar, date: '2023-03-07').count, 1);
        expect(
          _dayOn(result.calendar, date: '2023-03-07').level,
          ContributionLevel.veryHigh,
        );
      },
    );

    test('falls back to the derived level when data-level is absent', () async {
      final html =
          _day(id: 'a', date: '2023-03-06') +
          _day(id: 'b', date: '2023-03-07') +
          _tooltip(id: 'a', count: 10) +
          _tooltip(id: 'b', count: 1);

      final repository = GitHubContributionRepository(
        httpClient: _clientReturning(html),
      );

      final result = await repository.fetchCalendar(
        username: username,
        year: year,
      );
      expect(
        _dayOn(result.calendar, date: '2023-03-06').level,
        ContributionLevel.veryHigh,
      );
      expect(
        _dayOn(result.calendar, date: '2023-03-07').level,
        ContributionLevel.low,
      );
    });

    test('keeps parsing when the day cell carries extra classes', () async {
      final html =
          _day(
            id: 'a',
            date: '2023-03-06',
            level: '3',
            cssClass: 'ContributionCalendar-day extra-class',
          ) +
          _tooltip(id: 'a', count: 5);

      final repository = GitHubContributionRepository(
        httpClient: _clientReturning(html),
      );

      final result = await repository.fetchCalendar(
        username: username,
        year: year,
      );

      expect(
        _dayOn(result.calendar, date: '2023-03-06').level,
        ContributionLevel.high,
      );
    });
  });

  group('GitHubContributionRepository grid', () {
    test(
      'builds whole Sunday-first weeks, as many as the Year needs',
      () async {
        final html =
            _day(id: 'a', date: '2023-03-06', level: '2') +
            _tooltip(id: 'a', count: 4);

        final result = await GitHubContributionRepository(
          httpClient: _clientReturning(html),
        ).fetchCalendar(username: username, year: year);

        expect(
          result.calendar.weeks.length,
          ContributionGridService.weeksFor(year.value),
        );
        expect(
          result.calendar.weeks.every((week) => week.days.length == 7),
          isTrue,
        );
        expect(
          result.calendar.weeks.every(
            (week) => week.days.first.date.weekday == DateTime.sunday,
          ),
          isTrue,
        );
      },
    );

    test(
      'pads absent dates as empty days without inventing contributions',
      () async {
        final html =
            _day(id: 'a', date: '2023-03-06', level: '2') +
            _tooltip(id: 'a', count: 4);

        final result = await GitHubContributionRepository(
          httpClient: _clientReturning(html),
        ).fetchCalendar(username: username, year: year);

        final days = _allDays(result.calendar);
        final padded = days
            .where((day) => day.date != DateTime.utc(2023, 3, 6))
            .toList();

        expect(padded, isNotEmpty);
        expect(
          padded.every((day) => day.count == null),
          isTrue,
          reason: 'a padding day has no Count, and null is not zero',
        );
        expect(
          padded.every((day) => day.level == ContributionLevel.none),
          isTrue,
        );
        expect(padded.any((day) => day.count == 0), isFalse);
        expect(result.calendar.totalContributions, 4);
      },
    );

    test('places a day inside daylight-saving time where its calendar date '
        'says', () async {
      final html =
          _day(id: 'a', date: '2023-07-15', level: '3') +
          _tooltip(id: 'a', count: 9);

      final result = await GitHubContributionRepository(
        httpClient: _clientReturning(html),
      ).fetchCalendar(username: username, year: year);

      expect(_dayOn(result.calendar, date: '2023-07-15').count, 9);
      expect(
        _dayOn(result.calendar, date: '2023-07-15').date,
        DateTime.utc(2023, 7, 15),
      );
    });

    test(
      'returns every day of a fresh read as a UTC date at midnight',
      () async {
        final html =
            _day(id: 'a', date: '2023-03-06', level: '2') +
            _tooltip(id: 'a', count: 4);

        final result = await GitHubContributionRepository(
          httpClient: _clientReturning(html),
        ).fetchCalendar(username: username, year: year);

        final days = _allDays(result.calendar);
        expect(days, isNotEmpty);
        for (final day in days) {
          expect(day.date.isUtc, isTrue, reason: '${day.date}');
          expect(
            day.date,
            DateTime.utc(day.date.year, day.date.month, day.date.day),
          );
        }
      },
    );

    test('runs in unbroken calendar-day order across the daylight-saving '
        'switches of Europe and of the United States', () async {
      final leapYear = Year(2024, today: testToday);
      final html = [
        for (final (index, date) in [
          '2024-03-09',
          '2024-03-10',
          '2024-03-11',
          '2024-03-30',
          '2024-03-31',
          '2024-04-01',
          '2024-10-26',
          '2024-10-27',
          '2024-10-28',
          '2024-11-02',
          '2024-11-03',
          '2024-11-04',
        ].indexed)
          _day(id: 'd$index', date: date, level: '2') +
              _tooltip(id: 'd$index', count: index + 1),
      ].join();

      final result = await GitHubContributionRepository(
        httpClient: _clientReturning(html),
      ).fetchCalendar(username: username, year: leapYear);

      final days = result.calendar.weeks.expand((week) => week.days).toList();
      for (var i = 1; i < days.length; i++) {
        expect(
          days[i].date.difference(days[i - 1].date),
          const Duration(hours: 24),
          reason: '${days[i - 1].date} to ${days[i].date}',
        );
      }
      for (final date in [
        '2024-03-10',
        '2024-03-31',
        '2024-10-27',
        '2024-11-03',
      ]) {
        expect(_dayOn(result.calendar, date: date).count, isNotNull);
      }
    });
  });

  group('GitHubContributionRepository cache', () {
    test('preserves GitHub levels across a cache round-trip', () async {
      final html =
          _day(id: 'a', date: '2023-03-06', level: '1') +
          _day(id: 'b', date: '2023-03-07', level: '4') +
          _tooltip(id: 'a', count: 10) +
          _tooltip(id: 'b', count: 1);

      final fresh = await GitHubContributionRepository(
        httpClient: _clientReturning(html),
      ).fetchCalendar(username: username, year: year);
      expect(fresh.fromCache, isFalse);

      final cached = await GitHubContributionRepository(
        httpClient: MockClient(
          (_) async => throw StateError('cache should have been used'),
        ),
      ).fetchCalendar(username: username, year: year);

      expect(cached.fromCache, isTrue);
      expect(
        _dayOn(cached.calendar, date: '2023-03-06').level,
        ContributionLevel.low,
      );
      expect(
        _dayOn(cached.calendar, date: '2023-03-07').level,
        ContributionLevel.veryHigh,
      );
    });

    test('derives the level of a cached day stored without one, as a fresh read of the same Counts does', () async {
      final html =
          _day(id: 'a', date: '2023-03-06') +
          _day(id: 'b', date: '2023-03-07') +
          _day(id: 'c', date: '2023-03-08') +
          _tooltip(id: 'a', count: 1) +
          _tooltip(id: 'b', count: 100) +
          _tooltip(id: 'c', count: 50);
      final fresh = await GitHubContributionRepository(
        httpClient: _clientReturning(html),
      ).fetchCalendar(username: username, year: year);

      final box = await Hive.openBox<dynamic>('contribution_cache_v3');
      await box.put('other:${year.value}', {
        'cachedAt': DateTime(2024, 2).toIso8601String(),
        'json': jsonEncode({
          'totalContributions': 151,
          'weeks': [
            {
              'contributionDays': [
                {'date': '2023-03-06', 'contributionCount': 1},
                {'date': '2023-03-07', 'contributionCount': 100},
                {'date': '2023-03-08', 'contributionCount': 50},
              ],
            },
          ],
        }),
      });
      final cached = await GitHubContributionRepository(
        httpClient: MockClient(
          (_) async => throw StateError('cache should have been used'),
        ),
      ).fetchCalendar(username: Username('other'), year: year);

      expect(cached.fromCache, isTrue);
      for (final date in ['2023-03-06', '2023-03-07', '2023-03-08']) {
        expect(
          _dayOn(cached.calendar, date: date).level,
          _dayOn(fresh.calendar, date: date).level,
          reason: date,
        );
      }
      expect(
        [
          '2023-03-06',
          '2023-03-07',
          '2023-03-08',
        ].map((date) => _dayOn(cached.calendar, date: date).level),
        [
          ContributionLevel.low,
          ContributionLevel.veryHigh,
          ContributionLevel.medium,
        ],
      );
    });

    test('writes every field the read side declares, and no other', () async {
      final html =
          _day(id: 'a', date: '2023-03-06', level: '3') +
          _tooltip(id: 'a', count: 7);

      await GitHubContributionRepository(httpClient: _clientReturning(html))
          .fetchCalendar(username: username, year: year);

      final box = await Hive.openBox<dynamic>('contribution_cache_v3');
      final entry = box.get('${username.value}:${year.value}') as Map;
      final stored =
          jsonDecode(entry['json'] as String) as Map<String, dynamic>;

      expect(stored.keys, unorderedEquals(['totalContributions', 'weeks']));
      final day =
          ((stored['weeks'] as List).first as Map)['contributionDays'] as List;
      expect(
        (day.first as Map).keys,
        unorderedEquals(['date', 'contributionCount', 'level']),
        reason:
            'the write side is generated from the DTO now, so a field '
            'added to one and not the other is a codegen change rather than '
            'a silent drift',
      );
    });

    test('reads every day back from the cache as a UTC date', () async {
      final html =
          _day(id: 'a', date: '2023-03-06', level: '1') +
          _tooltip(id: 'a', count: 10);

      final fresh = await GitHubContributionRepository(
        httpClient: _clientReturning(html),
      ).fetchCalendar(username: username, year: year);
      final cached = await GitHubContributionRepository(
        httpClient: MockClient(
          (_) async => throw StateError('cache should have been used'),
        ),
      ).fetchCalendar(username: username, year: year);

      final days = _allDays(cached.calendar);
      expect(cached.fromCache, isTrue);
      expect(days, isNotEmpty);
      expect(days.every((day) => day.date.isUtc), isTrue);
      expect(
        cached.calendar,
        fresh.calendar,
        reason: 'a cache hit holds the same days as the read that wrote it',
      );
    });

    test('reads a stored YYYY-MM-DD as the UTC date it names', () async {
      final box = await Hive.openBox<dynamic>('contribution_cache_v3');
      await box.put('other:${year.value}', {
        'cachedAt': DateTime(2024, 2).toIso8601String(),
        'json': jsonEncode({
          'totalContributions': 5,
          'weeks': [
            {
              'contributionDays': [
                {'date': '2023-03-26', 'contributionCount': 5, 'level': 2},
              ],
            },
          ],
        }),
      });

      final cached = await GitHubContributionRepository(
        httpClient: MockClient(
          (_) async => throw StateError('cache should have been used'),
        ),
      ).fetchCalendar(username: Username('other'), year: year);

      final stored = _dayOn(cached.calendar, date: '2023-03-26');
      expect(cached.fromCache, isTrue);
      expect(stored.date, DateTime.utc(2023, 3, 26));
      expect(stored.count, 5);
      expect(stored.level, ContributionLevel.medium);
    });

    test('stores each day as its YYYY-MM-DD, one calendar day after the '
        'other', () async {
      final html =
          _day(id: 'a', date: '2023-03-26', level: '3') +
          _tooltip(id: 'a', count: 7);

      await GitHubContributionRepository(httpClient: _clientReturning(html))
          .fetchCalendar(username: username, year: year);

      final box = await Hive.openBox<dynamic>('contribution_cache_v3');
      final entry = box.get('${username.value}:${year.value}') as Map;
      final stored =
          jsonDecode(entry['json'] as String) as Map<String, dynamic>;
      final dates = [
        for (final week in stored['weeks'] as List)
          for (final day in (week as Map)['contributionDays'] as List)
            (day as Map)['date'] as String,
      ];

      expect(dates, hasLength(371));
      expect(dates.first, '2023-01-01');
      expect(dates.last, '2024-01-06');
      expect(dates, contains('2023-03-26'));
      for (var i = 1; i < dates.length; i++) {
        expect(
          DateTime.parse('${dates[i]}T00:00:00Z')
              .difference(DateTime.parse('${dates[i - 1]}T00:00:00Z')),
          const Duration(hours: 24),
          reason: '${dates[i - 1]} to ${dates[i]}',
        );
      }
    });
  });

  group('GitHubContributionRepository failures', () {
    test('reports unparseable markup as ParseFailure, not NotFound', () async {
      final repository = GitHubContributionRepository(
        httpClient: _clientReturning(
          '<html><body>no calendar here</body></html>',
        ),
      );

      expect(
        () => repository.fetchCalendar(username: username, year: year),
        throwsA(isA<ParseFailure>()),
      );
    });

    test(
      'reports a Username GitHub does not know as NotFoundFailure',
      () async {
        final repository = GitHubContributionRepository(
          httpClient: _clientReturning('', status: 404),
        );

        expect(
          () => repository.fetchCalendar(username: username, year: year),
          throwsA(isA<NotFoundFailure>()),
        );
      },
    );

    test('reports HTTP 429 as RateLimitedFailure with a reset time', () async {
      final repository = GitHubContributionRepository(
        httpClient: _clientReturning(
          '',
          status: 429,
          headers: {'retry-after': '60'},
        ),
        now: () => DateTime.utc(2031, 6, 15, 12),
      );

      await expectLater(
        () => repository.fetchCalendar(username: username, year: year),
        throwsA(
          isA<RateLimitedFailure>().having(
            (f) => f.resetAt,
            'resetAt',
            DateTime.utc(2031, 6, 15, 12, 1),
          ),
        ),
      );
    });

    test('reads a Retry-After sent as an HTTP date', () async {
      final repository = GitHubContributionRepository(
        httpClient: _clientReturning(
          '',
          status: 429,
          headers: {'retry-after': 'Wed, 21 Oct 2015 07:28:00 GMT'},
        ),
      );

      await expectLater(
        () => repository.fetchCalendar(username: username, year: year),
        throwsA(
          isA<RateLimitedFailure>().having(
            (f) => f.resetAt,
            'resetAt',
            DateTime.utc(2015, 10, 21, 7, 28),
          ),
        ),
      );
    });

    test('reports a socket that never opened as NetworkFailure', () async {
      final repository = GitHubContributionRepository(
        httpClient: MockClient(
          (_) async => throw const SocketException('Network is unreachable'),
        ),
      );

      await expectLater(
        repository.fetchCalendar(username: username, year: year),
        throwsA(isA<NetworkFailure>()),
      );
    });

    test('reports a connection the client lost as NetworkFailure', () async {
      final repository = GitHubContributionRepository(
        httpClient: MockClient(
          (_) async => throw http.ClientException('Connection closed'),
        ),
      );

      await expectLater(
        repository.fetchCalendar(username: username, year: year),
        throwsA(isA<NetworkFailure>()),
      );
    });

    test('lets anything that is not an IO error keep its type, so a defect is '
        'reported as one', () async {
      final repository = GitHubContributionRepository(
        httpClient: MockClient((_) async => throw StateError('a bug')),
      );

      await expectLater(
        repository.fetchCalendar(username: username, year: year),
        throwsA(isA<StateError>()),
      );
    });

    test(
      'reports other non-200 responses as UpstreamFailure, not NetworkFailure',
      () async {
        for (final status in [403, 500, 503]) {
          final repository = GitHubContributionRepository(
            httpClient: _clientReturning('', status: status),
          );

          await expectLater(
            repository.fetchCalendar(username: username, year: year),
            throwsA(
              isA<UpstreamFailure>().having(
                (failure) => failure.message,
                'message',
                'HTTP $status',
              ),
            ),
            reason: 'status $status',
          );
        }
      },
    );
  });

  group('a Count GitHub did not spell out', () {
    test(
      'is unknown, not zero, when the tool-tip has no leading number',
      () async {
        final html =
            '${_day(id: 'c1', date: '2024-06-03', level: '3')}'
            '<tool-tip for="c1">No contributions on June 3rd.</tool-tip>';
        final repository = GitHubContributionRepository(
          httpClient: _clientReturning(html),
        );

        final (:calendar, fromCache: _) = await repository.fetchCalendar(
          username: Username('torvalds'),
          year: Year(2024, today: testToday),
        );

        expect(_dayOn(calendar, date: '2024-06-03').count, isNull);
      },
    );

    test('is unknown when no tool-tip refers to the day at all', () async {
      final html = _day(id: 'c1', date: '2024-06-03', level: '2');
      final repository = GitHubContributionRepository(
        httpClient: _clientReturning(html),
      );

      final (:calendar, fromCache: _) = await repository.fetchCalendar(
        username: Username('torvalds'),
        year: Year(2024, today: testToday),
      );

      expect(_dayOn(calendar, date: '2024-06-03').count, isNull);
    });

    test(
      'leaves the padding days unknown rather than claiming they were empty',
      () async {
        final html =
            _day(id: 'c1', date: '2024-06-03', level: '2') +
            _tooltip(id: 'c1', count: 4);
        final repository = GitHubContributionRepository(
          httpClient: _clientReturning(html),
        );

        final (:calendar, fromCache: _) = await repository.fetchCalendar(
          username: Username('torvalds'),
          year: Year(2024, today: testToday),
        );

        expect(_dayOn(calendar, date: '2024-06-04').count, isNull);
      },
    );

    test('voids Total Contributions, rather than passing a lower bound off as exact', () async {
      final html =
          _day(id: 'c1', date: '2024-06-03', level: '3') +
          _tooltip(id: 'c1', count: 4) +
          _day(id: 'c2', date: '2024-06-04', level: '2');
      final repository = GitHubContributionRepository(
        httpClient: _clientReturning(html),
      );

      final (:calendar, fromCache: _) = await repository.fetchCalendar(
        username: Username('torvalds'),
        year: Year(2024, today: testToday),
      );

      expect(calendar.totalContributions, isNull);
    });

    test('still totals when every active day carries a Count', () async {
      final html =
          _day(id: 'c1', date: '2024-06-03', level: '3') +
          _tooltip(id: 'c1', count: 4) +
          _day(id: 'c2', date: '2024-06-04', level: '3') +
          _tooltip(id: 'c2', count: 6);
      final repository = GitHubContributionRepository(
        httpClient: _clientReturning(html),
      );

      final (:calendar, fromCache: _) = await repository.fetchCalendar(
        username: Username('torvalds'),
        year: Year(2024, today: testToday),
      );

      expect(calendar.totalContributions, 10);
    });
  });
  group('the cache freezes a Year only once that Year has ended', () {
    final closedYear = Year(2023, today: testToday);
    final html =
        _day(id: 'a', date: '2023-06-01', level: '2') +
        _tooltip(id: 'a', count: 7);

    test(
      'a snapshot written before the Year ended still expires afterwards',
      () async {
        var served = 0;
        final client = MockClient((_) async {
          served++;
          return http.Response(html, 200);
        });
        final onNewYearsEve = GitHubContributionRepository(
          httpClient: client,
          now: () => DateTime(2023, 12, 31, 23, 30),
        );
        await onNewYearsEve.fetchCalendar(username: username, year: closedYear);

        final twoDaysLater = GitHubContributionRepository(
          httpClient: client,
          now: () => DateTime(2024, 1, 2),
        );
        final second = await twoDaysLater.fetchCalendar(
          username: username,
          year: closedYear,
        );

        expect(second.fromCache, isFalse);
        expect(served, 2);
      },
    );

    test('a snapshot written after the Year ended never expires', () async {
      var served = 0;
      final client = MockClient((_) async {
        served++;
        return http.Response(html, 200);
      });
      final justAfter = GitHubContributionRepository(
        httpClient: client,
        now: () => DateTime(2024, 1, 2),
      );
      await justAfter.fetchCalendar(username: username, year: closedYear);

      final muchLater = GitHubContributionRepository(
        httpClient: client,
        now: () => DateTime(2026, 8, 21),
      );
      final second = await muchLater.fetchCalendar(
        username: username,
        year: closedYear,
      );

      expect(second.fromCache, isTrue);
      expect(served, 1);
    });
  });

  group('the cache key ignores case, because GitHub Usernames do', () {
    final html =
        _day(id: 'a', date: '2023-06-01', level: '2') +
        _tooltip(id: 'a', count: 7);

    test('two spellings of one account share an entry', () async {
      var served = 0;
      final client = MockClient((_) async {
        served++;
        return http.Response(html, 200);
      });
      final repository = GitHubContributionRepository(httpClient: client);

      await repository.fetchCalendar(username: Username('OctoCat'), year: year);
      final second = await repository.fetchCalendar(
        username: Username('octocat'),
        year: year,
      );

      expect(second.fromCache, isTrue);
      expect(served, 1);
    });

    test('invalidating one spelling clears the other', () async {
      var served = 0;
      final client = MockClient((_) async {
        served++;
        return http.Response(html, 200);
      });
      final repository = GitHubContributionRepository(httpClient: client);

      await repository.fetchCalendar(username: Username('OctoCat'), year: year);
      await repository.invalidateCache(Username('octocat'));
      final second = await repository.fetchCalendar(
        username: Username('OctoCat'),
        year: year,
      );

      expect(second.fromCache, isFalse);
      expect(served, 2);
    });
  });

  group('a Contribution Day GitHub coloured but did not identify', () {
    test('survives with an unknown Count, as ADR 0019 requires', () async {
      const orphanMarkup =
          '<td class="ContributionCalendar-day" data-date="2023-06-01" '
          'data-level="3"></td>';
      final html =
          orphanMarkup +
          _day(id: 'b', date: '2023-06-02', level: '1') +
          _tooltip(id: 'b', count: 4);

      final repository = GitHubContributionRepository(
        httpClient: _clientReturning(html),
      );
      final result = await repository.fetchCalendar(
        username: username,
        year: year,
      );

      final orphan = _dayOn(result.calendar, date: '2023-06-01');
      expect(orphan.level, ContributionLevel.high);
      expect(orphan.count, isNull);
      expect(orphan.isActive, isTrue);
    });

    test('voids Total Contributions rather than understating them', () async {
      const orphanMarkup =
          '<td class="ContributionCalendar-day" data-date="2023-06-01" '
          'data-level="3"></td>';
      final html =
          orphanMarkup +
          _day(id: 'b', date: '2023-06-02', level: '1') +
          _tooltip(id: 'b', count: 4);

      final repository = GitHubContributionRepository(
        httpClient: _clientReturning(html),
      );
      final result = await repository.fetchCalendar(
        username: username,
        year: year,
      );

      expect(result.calendar.totalContributions, isNull);
    });
  });
}

final class _ClosingClient extends http.BaseClient {
  _ClosingClient({required this._inner, required this._onClose});

  final http.Client _inner;
  final void Function() _onClose;

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) =>
      _inner.send(request);

  @override
  void close() {
    _onClose();
    _inner.close();
  }
}
