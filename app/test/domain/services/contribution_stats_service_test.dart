import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/entities/contribution_day.dart';
import 'package:contribkit/domain/entities/contribution_week.dart';
import 'package:contribkit/domain/services/contribution_stats_service.dart';
import 'package:contribkit/domain/value_objects/contribution_level.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/fixtures.dart';

ContributionCalendar _calendar(List<(DateTime, int)> dayData) {
  final days =
      dayData
          .map(
            (e) => ContributionDay(
              date: e.$1,
              count: e.$2,
              level: e.$2 == 0 ? ContributionLevel.none : ContributionLevel.low,
            ),
          )
          .toList()
        ..sort((a, b) => a.date.compareTo(b.date));

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

  return ContributionCalendar(
    username: Username('testuser'),
    year: Year(2024, today: testToday),
    weeks: weeks,
    totalContributions: ContributionStatsService.totalFor(days),
  );
}

DateTime _d({required int month, required int day}) =>
    DateTime.utc(2024, month, day);

ContributionCalendar _calendarWithUnknownCount() {
  final days = [
    ContributionDay(
      date: DateTime.utc(2024, 6, 3),
      count: 5,
      level: ContributionLevel.high,
    ),
    ContributionDay(
      date: DateTime.utc(2024, 6, 4),
      count: null,
      level: ContributionLevel.high,
    ),
  ];

  return ContributionCalendar(
    username: Username('testuser'),
    year: Year(2024, today: testToday),
    weeks: [ContributionWeek(days: days)],
    totalContributions: null,
  );
}

final _today = DateTime(2024, 12, 31);

void main() {
  group('ContributionStatsService.compute', () {
    test('counts nothing, and measures nothing, for an empty calendar', () {
      final cal = _calendar([]);
      final stats = ContributionStatsService.compute(cal, today: _today);

      expect(stats.currentStreak, 0);
      expect(stats.longestStreak, 0);
      expect(stats.totalDaysActive, 0);
      expect(stats.bestDayDate, isNull);
      expect(stats.bestMonth, isNull);
      expect(stats.bestDayCount, isNull);
      expect(stats.weeklyAverage, isNull);
      expect(stats.bestMonthContributions, isNull);
    });

    test(
      'reports no derived figure when an active day has an unknown Count',
      () {
        final cal = _calendarWithUnknownCount();
        final stats = ContributionStatsService.compute(cal, today: _today);

        expect(stats.bestDayCount, isNull);
        expect(
          stats.bestDayDate,
          isNull,
          reason: 'a date with no number beside it is not an answer',
        );
        expect(stats.bestMonthContributions, isNull);
        expect(
          stats.totalDaysActive,
          greaterThan(0),
          reason:
              'the day is still active, and only the figures derived from '
              'Counts are unknowable',
        );
      },
    );

    test('counts a single active day correctly', () {
      final cal = _calendar([(_d(month: 6, day: 15), 5)]);
      final stats = ContributionStatsService.compute(cal, today: _today);

      expect(stats.longestStreak, 1);
      expect(stats.bestDayCount, 5);
      expect(stats.bestDayDate, _d(month: 6, day: 15));
      expect(stats.totalDaysActive, 1);
      expect(stats.bestMonth, 6);
      expect(stats.bestMonthContributions, 5);
    });

    test('computes longest streak across consecutive days', () {
      final cal = _calendar([
        (_d(month: 3, day: 1), 2),
        (_d(month: 3, day: 2), 3),
        (_d(month: 3, day: 3), 1),
        (_d(month: 3, day: 4), 0),
        (_d(month: 3, day: 5), 4),
        (_d(month: 3, day: 6), 5),
      ]);
      final stats = ContributionStatsService.compute(cal, today: _today);
      expect(stats.longestStreak, 3);
    });

    test('finds the best day by contribution count', () {
      final cal = _calendar([
        (_d(month: 1, day: 10), 3),
        (_d(month: 1, day: 11), 10),
        (_d(month: 1, day: 12), 7),
      ]);
      final stats = ContributionStatsService.compute(cal, today: _today);
      expect(stats.bestDayCount, 10);
      expect(stats.bestDayDate, _d(month: 1, day: 11));
    });

    test('counts total active days ignoring zeros', () {
      final cal = _calendar([
        (_d(month: 2, day: 1), 1),
        (_d(month: 2, day: 2), 0),
        (_d(month: 2, day: 3), 3),
        (_d(month: 2, day: 4), 0),
        (_d(month: 2, day: 5), 2),
      ]);
      final stats = ContributionStatsService.compute(cal, today: _today);
      expect(stats.totalDaysActive, 3);
    });

    test('identifies the best month', () {
      final cal = _calendar([
        (_d(month: 1, day: 5), 5),
        (_d(month: 1, day: 6), 5),
        (_d(month: 2, day: 1), 8),
        (_d(month: 2, day: 2), 8),
        (_d(month: 3, day: 1), 3),
      ]);
      final stats = ContributionStatsService.compute(cal, today: _today);
      expect(stats.bestMonth, 2);
      expect(stats.bestMonthContributions, 16);
    });

    test('weekly average is Total Contributions divided by the week count', () {
      final cal = _calendar([
        (_d(month: 1, day: 7), 6),
        (_d(month: 1, day: 14), 4),
      ]);
      final stats = ContributionStatsService.compute(cal, today: _today);

      expect(cal.weeks, hasLength(2));
      expect(stats.weeklyAverage, 5.0);
    });

    test('longestStreak equals all days when every day is active', () {
      final cal = _calendar([
        (_d(month: 5, day: 1), 1),
        (_d(month: 5, day: 2), 2),
        (_d(month: 5, day: 3), 3),
        (_d(month: 5, day: 4), 4),
        (_d(month: 5, day: 5), 5),
      ]);
      final stats = ContributionStatsService.compute(cal, today: _today);
      expect(stats.longestStreak, 5);
    });
  });
  group('ContributionStatsService.totalFor', () {
    test(
      'is the one place the unknown-Count rule lives, and the parser uses it',
      () {
        expect(
          ContributionStatsService.totalFor([
            ContributionDay(
              date: DateTime.utc(2024, 1, 1),
              count: 5,
              level: ContributionLevel.medium,
            ),
          ]),
          5,
        );
        expect(
          ContributionStatsService.totalFor([
            ContributionDay(
              date: DateTime.utc(2024, 1, 1),
              count: null,
              level: ContributionLevel.veryHigh,
            ),
          ]),
          isNull,
          reason: 'an unknown Count on an active day voids the Total',
        );
        expect(
          ContributionStatsService.totalFor([
            ContributionDay(
              date: DateTime.utc(2024, 1, 1),
              count: null,
              level: ContributionLevel.none,
            ),
            ContributionDay(
              date: DateTime.utc(2024, 1, 2),
              count: 5,
              level: ContributionLevel.medium,
            ),
          ]),
          5,
          reason: 'a level-none unknown is the zero GitHub means',
        );
      },
    );
  });
}
