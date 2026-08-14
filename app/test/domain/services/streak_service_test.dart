import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/entities/contribution_day.dart';
import 'package:contribkit/domain/entities/contribution_week.dart';
import 'package:contribkit/domain/services/streak_service.dart';
import 'package:contribkit/domain/value_objects/contribution_level.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:flutter_test/flutter_test.dart';

ContributionCalendar calendarFor({
  required int year,
  required bool Function(DateTime date) isActive,
}) {
  final firstOfYear = DateTime(year, 1, 1);
  final start = DateTime(year, 1, 1 - (firstOfYear.weekday % 7));
  final weeks = <ContributionWeek>[];

  for (var week = 0; week < 53; week++) {
    final days = <ContributionDay>[];
    for (var day = 0; day < 7; day++) {
      final date = DateTime(
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
    year: Year(year),
    weeks: weeks,
    totalContributions: 0,
  );
}

void main() {
  group('StreakService.currentFor a past Year', () {
    test('reports the run the Year actually ended on, not zero', () {
      final calendar = calendarFor(
        year: 2019,
        isActive: (date) => date.isAfter(DateTime(2019, 12, 21)),
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
        isActive: (date) => !date.isBefore(DateTime(2026, 8, 10)),
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
            !date.isBefore(DateTime(2026, 8, 10)) &&
            date.isBefore(DateTime(2026, 8, 14)),
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

    test('is zero when the run broke before today', () {
      final calendar = calendarFor(
        year: 2026,
        isActive: (date) => date.isBefore(DateTime(2026, 8, 1)),
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

  test(
    'the Viewer and the Home Screen Widget agree, because both ask this module',
    () {
      final calendar = calendarFor(
        year: 2019,
        isActive: (date) => date.isAfter(DateTime(2019, 12, 25)),
      );
      final today = DateTime(2026, 8, 14);

      expect(
        StreakService.currentFor(calendar: calendar, today: today),
        StreakService.currentFor(calendar: calendar, today: today),
      );
      expect(StreakService.currentFor(calendar: calendar, today: today), 6);
    },
  );
}
