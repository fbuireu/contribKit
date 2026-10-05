import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/entities/contribution_day.dart';
import 'package:contribkit/domain/entities/contribution_week.dart';
import 'package:contribkit/domain/services/contribution_grid_service.dart';
import 'package:contribkit/domain/services/streak_service.dart';
import 'package:contribkit/domain/value_objects/contribution_level.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/fixtures.dart';

ContributionCalendar calendarFor({
  required int year,
  required bool Function(DateTime date) isActive,
}) {
  final firstOfYear = DateTime.utc(year, 1, 1);
  final start = DateTime.utc(year, 1, 1 - (firstOfYear.weekday % 7));
  final weekCount = ContributionGridService.weeksFor(year);
  final weeks = <ContributionWeek>[];

  for (var week = 0; week < weekCount; week++) {
    final days = <ContributionDay>[];
    for (var day = 0; day < 7; day++) {
      final date = DateTime.utc(
        start.year,
        start.month,
        start.day + week * 7 + day,
      );
      final active = date.year == year && isActive(date);
      days.add(
        ContributionDay(
          date: date,
          count: active ? 5 : 0,
          level: active ? ContributionLevel.high : ContributionLevel.none,
        ),
      );
    }
    weeks.add(ContributionWeek(days: days));
  }

  return ContributionCalendar(
    username: Username('torvalds'),
    year: Year(year, today: testToday),
    weeks: weeks,
    totalContributions: 0,
  );
}

void main() {
  group('StreakService.currentFor a past Year', () {
    test('reports the streak the Year actually ended on, not zero', () {
      final calendar = calendarFor(
        year: 2019,
        isActive: (date) => date.isAfter(DateTime.utc(2019, 12, 21)),
      );

      expect(
        StreakService.currentFor(
          calendar: calendar,
          today: DateTime(2026, 8, 14),
        ),
        10,
      );
    });

    test(
      'is not defeated by the padding days the grid adds after 31 December',
      () {
        final calendar = calendarFor(year: 2019, isActive: (_) => true);

        expect(
          StreakService.currentFor(
            calendar: calendar,
            today: DateTime(2026, 8, 14),
          ),
          365,
        );
      },
    );

    test('is zero when the Year ended inactive', () {
      final calendar = calendarFor(
        year: 2019,
        isActive: (date) => date.month == 6,
      );

      expect(
        StreakService.currentFor(
          calendar: calendar,
          today: DateTime(2026, 8, 14),
        ),
        0,
      );
    });
  });

  group('StreakService.currentFor the current Year', () {
    test('counts back from today', () {
      final calendar = calendarFor(
        year: 2026,
        isActive: (date) => !date.isBefore(DateTime.utc(2026, 8, 10)),
      );

      expect(
        StreakService.currentFor(
          calendar: calendar,
          today: DateTime(2026, 8, 14),
        ),
        5,
      );
    });

    test('does not break the streak on a today that has not happened yet', () {
      final calendar = calendarFor(
        year: 2026,
        isActive: (date) =>
            !date.isBefore(DateTime.utc(2026, 8, 10)) &&
            date.isBefore(DateTime.utc(2026, 8, 14)),
      );

      expect(
        StreakService.currentFor(
          calendar: calendar,
          today: DateTime(2026, 8, 14),
        ),
        4,
      );
    });

    test('ignores days in the future', () {
      final calendar = calendarFor(year: 2026, isActive: (_) => true);

      expect(
        StreakService.currentFor(
          calendar: calendar,
          today: DateTime(2026, 1, 3),
        ),
        3,
      );
    });

    test('is zero when the streak broke before today', () {
      final calendar = calendarFor(
        year: 2026,
        isActive: (date) => date.isBefore(DateTime.utc(2026, 8, 1)),
      );

      expect(
        StreakService.currentFor(
          calendar: calendar,
          today: DateTime(2026, 8, 14),
        ),
        0,
      );
    });
  });

  group('StreakService.currentFor reads today as the date its local instant '
      'falls on', () {
    final calendar = calendarFor(
      year: 2026,
      isActive: (date) =>
          !date.isBefore(DateTime.utc(2026, 8, 10)) &&
          !date.isAfter(DateTime.utc(2026, 8, 14)),
    );

    test(
      'late in the evening, which a UTC reading carries to the next day',
      () {
        expect(
          StreakService.currentFor(
            calendar: calendar,
            today: DateTime(2026, 8, 13, 23, 30),
          ),
          4,
          reason: '13 August is not over, and 14 August has not happened',
        );
      },
    );

    test('early in the morning, which a UTC reading carries to the day '
        'before', () {
      expect(
        StreakService.currentFor(
          calendar: calendar,
          today: DateTime(2026, 8, 14, 0, 30),
        ),
        5,
        reason: '14 August has begun, whatever hour it is in UTC',
      );
    });

    for (final (month, dayOfMonth, name) in [
      (3, 31, '31 March'),
      (10, 27, '27 October'),
      (3, 10, '10 March'),
      (11, 3, '3 November'),
    ]) {
      test('on the daylight-saving switch of $name', () {
        final switchDay = DateTime.utc(2024, month, dayOfMonth);
        final threeDays = calendarFor(
          year: 2024,
          isActive: (date) =>
              !date.isBefore(DateTime.utc(2024, month, dayOfMonth - 2)) &&
              !date.isAfter(switchDay),
        );

        expect(
          StreakService.currentFor(
            calendar: threeDays,
            today: DateTime(2024, month, dayOfMonth, 0, 30),
          ),
          3,
        );
        expect(
          StreakService.currentFor(
            calendar: threeDays,
            today: DateTime(2024, month, dayOfMonth, 23, 30),
          ),
          3,
        );
        expect(
          StreakService.currentFor(
            calendar: threeDays,
            today: DateTime(2024, month, dayOfMonth - 1, 23, 30),
          ),
          2,
          reason: 'the day before the switch has not ended at 23:30',
        );
      });
    }
  });

  group('a Count nobody could read', () {
    ContributionCalendar withUnknownCounts({required int year}) {
      final firstOfYear = DateTime.utc(year, 1, 1);
      final start = DateTime.utc(year, 1, 1 - (firstOfYear.weekday % 7));
      final weekCount = ContributionGridService.weeksFor(year);
      final weeks = <ContributionWeek>[];
      for (var week = 0; week < weekCount; week++) {
        final days = <ContributionDay>[];
        for (var day = 0; day < 7; day++) {
          final date = DateTime.utc(
            start.year,
            start.month,
            start.day + week * 7 + day,
          );
          final active =
              date.year == year && date.isAfter(DateTime.utc(year, 12, 21));
          days.add(
            ContributionDay(
              date: date,
              count: null,
              level: active ? ContributionLevel.high : ContributionLevel.none,
            ),
          );
        }
        weeks.add(ContributionWeek(days: days));
      }
      return ContributionCalendar(
        username: Username('torvalds'),
        year: Year(year, today: testToday),
        weeks: weeks,
        totalContributions: null,
      );
    }

    test(
      'still continues the streak, because the Contribution Level says active',
      () {
        expect(
          StreakService.currentFor(
            calendar: withUnknownCounts(year: 2019),
            today: DateTime(2026, 8, 14),
          ),
          10,
        );
      },
    );
  });
}
