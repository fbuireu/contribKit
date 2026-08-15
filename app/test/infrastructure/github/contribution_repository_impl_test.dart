import 'dart:io';

import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/entities/contribution_day.dart';
import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/value_objects/contribution_level.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/infrastructure/github/contribution_repository_impl.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

String _day({
  required String id,
  required String date,
  String? level,
  String cssClass = 'ContributionCalendar-day',
}) {
  final levelAttr = level == null ? '' : ' data-level="$level"';
  return '<td class="$cssClass" id="$id" data-date="$date"$levelAttr></td>';
}

String _tip({required String id, required int count}) =>
    '<tool-tip for="$id">$count contributions on some day.</tool-tip>';

http.Client _clientReturning(
  String body, {
  int status = 200,
  Map<String, String> headers = const {},
}) => MockClient((_) async => http.Response(body, status, headers: headers));

List<ContributionDay> _allDays(ContributionCalendar calendar) =>
    calendar.weeks.expand((week) => week.days).toList()
      ..sort((a, b) => a.date.compareTo(b.date));

ContributionDay _dayOn(ContributionCalendar calendar, String iso) {
  final wanted = DateTime.parse(iso);
  return _allDays(calendar).firstWhere(
    (day) =>
        day.date.year == wanted.year &&
        day.date.month == wanted.month &&
        day.date.day == wanted.day,
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final username = Username('octocat');
  final year = Year(2023);
  late Directory hiveDir;

  setUp(() async {
    hiveDir = await Directory.systemTemp.createTemp('contribkit_cache_test');
    Hive.init(hiveDir.path);
  });

  tearDown(() async {
    await Hive.close();
    if (hiveDir.existsSync()) await hiveDir.delete(recursive: true);
  });

  group('GitHubContributionRepository level derivation', () {
    test(
      'prefers GitHub data-level over a level derived from the count',
      () async {
        final html =
            _day(id: 'a', date: '2023-03-06', level: '1') +
            _day(id: 'b', date: '2023-03-07', level: '4') +
            _tip(id: 'a', count: 10) +
            _tip(id: 'b', count: 1);

        final repository = GitHubContributionRepository(
          httpClient: _clientReturning(html),
        );

        final result = await repository.fetchCalendar(
          username: username,
          year: year,
        );
        expect(_dayOn(result.calendar, '2023-03-06').count, 10);
        expect(
          _dayOn(result.calendar, '2023-03-06').level,
          ContributionLevel.low,
        );
        expect(_dayOn(result.calendar, '2023-03-07').count, 1);
        expect(
          _dayOn(result.calendar, '2023-03-07').level,
          ContributionLevel.veryHigh,
        );
      },
    );

    test('falls back to the derived level when data-level is absent', () async {
      final html =
          _day(id: 'a', date: '2023-03-06') +
          _day(id: 'b', date: '2023-03-07') +
          _tip(id: 'a', count: 10) +
          _tip(id: 'b', count: 1);

      final repository = GitHubContributionRepository(
        httpClient: _clientReturning(html),
      );

      final result = await repository.fetchCalendar(
        username: username,
        year: year,
      );
      expect(
        _dayOn(result.calendar, '2023-03-06').level,
        ContributionLevel.veryHigh,
      );
      expect(
        _dayOn(result.calendar, '2023-03-07').level,
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
          _tip(id: 'a', count: 5);

      final repository = GitHubContributionRepository(
        httpClient: _clientReturning(html),
      );

      final result = await repository.fetchCalendar(
        username: username,
        year: year,
      );

      expect(
        _dayOn(result.calendar, '2023-03-06').level,
        ContributionLevel.high,
      );
    });
  });

  group('GitHubContributionRepository grid', () {
    test(
      'always builds 53 whole weeks of 7 days regardless of the year',
      () async {
        final html =
            _day(id: 'a', date: '2023-03-06', level: '2') +
            _tip(id: 'a', count: 4);

        final result = await GitHubContributionRepository(
          httpClient: _clientReturning(html),
        ).fetchCalendar(username: username, year: year);

        expect(result.calendar.weeks.length, 53);
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
            _tip(id: 'a', count: 4);

        final result = await GitHubContributionRepository(
          httpClient: _clientReturning(html),
        ).fetchCalendar(username: username, year: year);

        final days = _allDays(result.calendar);
        final padded = days.where((day) => day.count == 0);
        expect(
          padded.every((day) => day.level == ContributionLevel.none),
          isTrue,
        );
        expect(result.calendar.totalContributions, 4);
      },
    );

    test('places a day that falls inside daylight saving time', () async {
      final html =
          _day(id: 'a', date: '2023-07-15', level: '3') +
          _tip(id: 'a', count: 9);

      final result = await GitHubContributionRepository(
        httpClient: _clientReturning(html),
      ).fetchCalendar(username: username, year: year);

      expect(_dayOn(result.calendar, '2023-07-15').count, 9);
      expect(
        _allDays(result.calendar)
            .every((day) => day.date.hour == 0 && day.date.minute == 0),
        isTrue,
      );
    });
  });

  group('GitHubContributionRepository cache', () {
    test('preserves GitHub levels across a cache round-trip', () async {
      final html =
          _day(id: 'a', date: '2023-03-06', level: '1') +
          _day(id: 'b', date: '2023-03-07', level: '4') +
          _tip(id: 'a', count: 10) +
          _tip(id: 'b', count: 1);

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
        _dayOn(cached.calendar, '2023-03-06').level,
        ContributionLevel.low,
      );
      expect(
        _dayOn(cached.calendar, '2023-03-07').level,
        ContributionLevel.veryHigh,
      );
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

    test('reports a missing user as NotFoundFailure', () async {
      final repository = GitHubContributionRepository(
        httpClient: _clientReturning('', status: 404),
      );

      expect(
        () => repository.fetchCalendar(username: username, year: year),
        throwsA(isA<NotFoundFailure>()),
      );
    });

    test('reports HTTP 429 as RateLimitedFailure with a reset time', () async {
      final repository = GitHubContributionRepository(
        httpClient: _clientReturning(
          '',
          status: 429,
          headers: {'retry-after': '60'},
        ),
      );

      await expectLater(
        () => repository.fetchCalendar(username: username, year: year),
        throwsA(
          isA<RateLimitedFailure>().having(
            (f) => f.resetAt,
            'resetAt',
            isNotNull,
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

    test('reports other non-200 responses as NetworkFailure', () async {
      final repository = GitHubContributionRepository(
        httpClient: _clientReturning('', status: 500),
      );

      expect(
        () => repository.fetchCalendar(username: username, year: year),
        throwsA(isA<NetworkFailure>()),
      );
    });
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
          year: Year(2024),
        );

        expect(_dayOn(calendar, '2024-06-03').count, isNull);
      },
    );

    test('is unknown when no tool-tip refers to the day at all', () async {
      final html = _day(id: 'c1', date: '2024-06-03', level: '2');
      final repository = GitHubContributionRepository(
        httpClient: _clientReturning(html),
      );

      final (:calendar, fromCache: _) = await repository.fetchCalendar(
        username: Username('torvalds'),
        year: Year(2024),
      );

      expect(_dayOn(calendar, '2024-06-03').count, isNull);
    });

    test(
      'leaves the padding days unknown rather than claiming they were empty',
      () async {
        final html =
            _day(id: 'c1', date: '2024-06-03', level: '2') +
            _tip(id: 'c1', count: 4);
        final repository = GitHubContributionRepository(
          httpClient: _clientReturning(html),
        );

        final (:calendar, fromCache: _) = await repository.fetchCalendar(
          username: Username('torvalds'),
          year: Year(2024),
        );

        expect(_dayOn(calendar, '2024-06-04').count, isNull);
      },
    );

    test('voids Total Contributions, rather than passing a lower bound off as exact', () async {
      final html =
          _day(id: 'c1', date: '2024-06-03', level: '3') +
          _tip(id: 'c1', count: 4) +
          _day(id: 'c2', date: '2024-06-04', level: '2');
      final repository = GitHubContributionRepository(
        httpClient: _clientReturning(html),
      );

      final (:calendar, fromCache: _) = await repository.fetchCalendar(
        username: Username('torvalds'),
        year: Year(2024),
      );

      expect(calendar.totalContributions, isNull);
    });

    test('still totals when every active day carries a Count', () async {
      final html =
          _day(id: 'c1', date: '2024-06-03', level: '3') +
          _tip(id: 'c1', count: 4) +
          _day(id: 'c2', date: '2024-06-04', level: '3') +
          _tip(id: 'c2', count: 6);
      final repository = GitHubContributionRepository(
        httpClient: _clientReturning(html),
      );

      final (:calendar, fromCache: _) = await repository.fetchCalendar(
        username: Username('torvalds'),
        year: Year(2024),
      );

      expect(calendar.totalContributions, 10);
    });
  });
}
