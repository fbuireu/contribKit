import 'package:contribkit/domain/entities/contribution_day.dart';
import 'package:contribkit/domain/services/contribution_grid_service.dart';
import 'package:contribkit/domain/value_objects/contribution_level.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:flutter_test/flutter_test.dart';

ContributionDay day(String iso, {int? count, ContributionLevel? level}) =>
    ContributionDay(
      date: DateTime.parse('${iso}T00:00:00Z'),
      count: count,
      level: level ?? ContributionLevel.high,
    );

void main() {
  group('ContributionGridService.buildFor', () {
    test(
      'emits whole weeks of 7 days, 53 of them for a Year that needs 53',
      () {
        for (final days in [
          <ContributionDay>[],
          [day('2024-06-15', count: 3)],
        ]) {
          final weeks = ContributionGridService.buildFor(
            days: days,
            year: 2024,
          );

          expect(weeks, hasLength(53));
          for (final week in weeks) {
            expect(week.days, hasLength(7));
          }
        }
      },
    );

    test('starts on the Sunday on or before 1 January', () {
      for (var year = Year.minYear; year <= 2060; year++) {
        final first = ContributionGridService.buildFor(
          days: const [],
          year: year,
        ).first.days.first.date;

        expect(first.weekday, DateTime.sunday, reason: 'year $year');
        expect(first.isAfter(DateTime.utc(year, 1, 1)), isFalse);
        expect(DateTime.utc(year, 1, 1).difference(first).inDays, lessThan(7));
      }
    });

    test('needs a 54th week only when a leap Year opens on a Saturday', () {
      final wide = <int>[
        for (var year = Year.minYear; year <= 2060; year++)
          if (ContributionGridService.weeksFor(year) != 53) year,
      ];

      expect(wide, [2028, 2056]);
      for (final year in wide) {
        expect(ContributionGridService.weeksFor(year), 54, reason: '$year');
        expect(DateTime.utc(year, 1, 1).weekday, DateTime.saturday);
      }
    });

    test('covers every day of the Year it was asked for', () {
      for (var year = Year.minYear; year <= 2060; year++) {
        final days = ContributionGridService.buildFor(
          days: const [],
          year: year,
        ).expand((week) => week.days).toList();

        expect(
          days.first.date.isAfter(DateTime.utc(year, 1, 1)),
          isFalse,
          reason: 'year $year drops 1 January',
        );
        expect(
          days.last.date.isBefore(DateTime.utc(year, 12, 31)),
          isFalse,
          reason: 'year $year drops 31 December',
        );
      }
    });

    test('builds every day as a UTC date at midnight, in any zone', () {
      for (final year in [2019, 2024, 2028]) {
        final days = ContributionGridService.buildFor(
          days: [day('$year-06-15', count: 1)],
          year: year,
        ).expand((week) => week.days).toList();

        expect(days, isNotEmpty);
        for (final d in days) {
          expect(d.date.isUtc, isTrue, reason: '${d.date} in $year');
          expect(d.date, DateTime.utc(d.date.year, d.date.month, d.date.day));
        }
      }
    });

    test('places a day on its own date', () {
      final weeks = ContributionGridService.buildFor(
        days: [day('2024-06-15', count: 9)],
        year: 2024,
      );
      final placed = weeks
          .expand((week) => week.days)
          .firstWhere((d) => d.count == 9);

      expect(placed.date, DateTime.utc(2024, 6, 15));
    });

    test('pads a day it was never given with an unknown Count, not a zero', () {
      final weeks = ContributionGridService.buildFor(
        days: [day('2024-06-15', count: 9)],
        year: 2024,
      );
      final padded = weeks
          .expand((week) => week.days)
          .firstWhere((d) => d.date != DateTime.utc(2024, 6, 15));

      expect(padded.count, isNull);
      expect(padded.level, ContributionLevel.none);
    });

    test('runs in unbroken calendar-day order across week boundaries', () {
      final days = ContributionGridService.buildFor(
        days: const [],
        year: 2024,
      ).expand((week) => week.days).toList();

      for (var i = 1; i < days.length; i++) {
        final previous = days[i - 1].date;
        expect(
          days[i].date,
          DateTime.utc(previous.year, previous.month, previous.day + 1),
          reason: 'the lattice steps by calendar day',
        );
        expect(
          days[i].date.difference(previous),
          const Duration(hours: 24),
          reason: 'a UTC date has no 23- or 25-hour day',
        );
      }
    });

    test('runs in unbroken calendar-day order across the daylight-saving '
        'switches of Europe and of the United States', () {
      final days = ContributionGridService.buildFor(
        days: const [],
        year: 2024,
      ).expand((week) => week.days).toList();

      for (final (month, dayOfMonth) in [(3, 31), (10, 27), (3, 10), (11, 3)]) {
        final switchDay = DateTime.utc(2024, month, dayOfMonth);
        final at = days.indexWhere((d) => d.date == switchDay);

        expect(at, greaterThan(0), reason: '$switchDay is on the grid');
        expect(
          days[at - 1].date,
          DateTime.utc(2024, month, dayOfMonth - 1),
          reason: 'the day before $switchDay',
        );
        expect(
          days[at + 1].date,
          DateTime.utc(2024, month, dayOfMonth + 1),
          reason: 'the day after $switchDay',
        );
        expect(
          switchDay.difference(days[at - 1].date),
          const Duration(hours: 24),
          reason: '$switchDay is as long as the day before it',
        );
        expect(
          days[at + 1].date.difference(switchDay),
          const Duration(hours: 24),
          reason: '$switchDay is as long as the day after it',
        );
      }
    });

    test('places a day of a daylight-saving switch where its calendar date '
        'says', () {
      final weeks = ContributionGridService.buildFor(
        days: [day('2024-03-31', count: 4)],
        year: 2024,
      );
      final placed = weeks
          .expand((week) => week.days)
          .where((d) => d.count == 4);

      expect(placed, hasLength(1));
      expect(placed.single.date, DateTime.utc(2024, 3, 31));
      expect(
        weeks[13].days[0].count,
        4,
        reason:
            '31 March is the 91st day after the Sunday that opens the lattice '
            'on 31 December: 13 whole weeks, and a Sunday',
      );
    });

    test('ignores a day outside the requested Year rather than shifting the lattice', () {
      final weeks = ContributionGridService.buildFor(
        days: [day('2019-05-01', count: 7)],
        year: 2024,
      );

      expect(
        weeks.expand((week) => week.days).any((d) => d.count == 7),
        isFalse,
      );
    });
  });
}
