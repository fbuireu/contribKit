import 'package:contribkit/application/use_cases/fetch_contributions.dart';
import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/repositories/contribution_repository.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:flutter_test/flutter_test.dart';

// Hand-written fake — no mock framework in unit tests.
final class _FakeContributionRepository implements ContributionRepository {
  _FakeContributionRepository({
    required this._calendar,
    this.fromCache = false,
  });

  final ContributionCalendar _calendar;
  final bool fromCache;

  Username? lastUsername;
  Year? lastYear;

  @override
  Future<({ContributionCalendar calendar, bool fromCache})> fetchCalendar({
    required Username username,
    required Year year,
  }) async {
    lastUsername = username;
    lastYear = year;
    return (calendar: _calendar, fromCache: fromCache);
  }

  @override
  Future<void> invalidateCache(Username username) async {}
}

void main() {
  final username = Username('octocat');
  final year = Year(2023);
  final emptyCalendar = ContributionCalendar(
    username: username,
    year: year,
    weeks: const [],
    totalContributions: 0,
  );

  group('FetchContributions', () {
    test('delegates to repository and returns result', () async {
      final repo = _FakeContributionRepository(calendar: emptyCalendar);
      final useCase = FetchContributions(repository: repo);

      final result = await useCase(username: username, year: year);

      expect(result.calendar, emptyCalendar);
      expect(result.fromCache, isFalse);
    });

    test('passes username and year to the repository', () async {
      final repo = _FakeContributionRepository(calendar: emptyCalendar);
      final useCase = FetchContributions(repository: repo);

      await useCase(username: username, year: year);

      expect(repo.lastUsername, username);
      expect(repo.lastYear, year);
    });

    test('propagates fromCache flag when data is cached', () async {
      final repo = _FakeContributionRepository(
        calendar: emptyCalendar,
        fromCache: true,
      );
      final useCase = FetchContributions(repository: repo);

      final result = await useCase(username: username, year: year);

      expect(result.fromCache, isTrue);
    });
  });
}
