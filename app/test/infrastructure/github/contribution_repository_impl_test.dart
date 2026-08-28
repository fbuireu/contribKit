import 'dart:convert';
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

  group('GitHubContributionRepository owns only the client it built', () {
    test(
      'leaves an injected client open, because the caller owns it',
      () async {
        var closed = false;
        final injected = MockClient((_) async {
          return http.Response('', 200);
        });
        final repository = GitHubContributionRepository(
          httpClient: _ClosingClient(injected, () => closed = true),
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
            _tip(id: 'a', count: 1) +
            _tip(id: 'b', count: 100);

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
        _dayOn(result.calendar, '2023-03-06').count,
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
        final padded = days
            .where((day) => day.date != DateTime(2023, 3, 6))
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

    test('writes every field the read side declares, and no other', () async {
      final html =
          _day(id: 'a', date: '2023-03-06', level: '3') +
          _tip(id: 'a', count: 7);

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
  group('the cache freezes a Year only once that Year has ended', () {
    final closedYear = Year(2023);
    final html =
        _day(id: 'a', date: '2023-06-01', level: '2') + _tip(id: 'a', count: 7);

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

  group('the cache key ignores case, because GitHub handles do', () {
    final html =
        _day(id: 'a', date: '2023-06-01', level: '2') + _tip(id: 'a', count: 7);

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
          _tip(id: 'b', count: 4);

      final repository = GitHubContributionRepository(
        httpClient: _clientReturning(html),
      );
      final result = await repository.fetchCalendar(
        username: username,
        year: year,
      );

      final orphan = _dayOn(result.calendar, '2023-06-01');
      expect(orphan.level, ContributionLevel.high);
      expect(orphan.count, isNull);
      expect(orphan.isActive, isTrue);
    });

    test('voids the Total rather than understating it', () async {
      const orphanMarkup =
          '<td class="ContributionCalendar-day" data-date="2023-06-01" '
          'data-level="3"></td>';
      final html =
          orphanMarkup +
          _day(id: 'b', date: '2023-06-02', level: '1') +
          _tip(id: 'b', count: 4);

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
  _ClosingClient(this._inner, this._onClose);

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
