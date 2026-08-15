import 'package:contribkit/domain/entities/contribution_day.dart';
import 'package:contribkit/domain/services/contribution_grid_service.dart';
import 'package:contribkit/domain/value_objects/contribution_level.dart';
import 'package:flutter_test/flutter_test.dart';

ContributionDay day(String iso, {int? count, ContributionLevel? level}) =>
    ContributionDay(
      date: DateTime.parse(iso),
      count: count,
      level: level ?? ContributionLevel.high,
    );

void main() {
  group('ContributionGridService.buildFor', () {
    test('always emits 53 weeks of 7 days, whatever it is given', () {
      for (final days in [
        <ContributionDay>[],
        [day('2024-06-15', count: 3)],
      ]) {
        final weeks = ContributionGridService.buildFor(days: days, year: 2024);

        expect(weeks, hasLength(53));
        for (final week in weeks) {
          expect(week.days, hasLength(7));
        }
      }
    });

    test('starts on the Sunday on or before 1 January', () {
      for (final year in [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]) {
        final first = ContributionGridService.buildFor(
          days: const [],
          year: year,
        ).first.days.first.date;

        expect(first.weekday, DateTime.sunday, reason: 'year $year');
        expect(first.isAfter(DateTime(year, 1, 1)), isFalse);
        expect(DateTime(year, 1, 1).difference(first).inDays, lessThan(7));
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

      expect(placed.date, DateTime(2024, 6, 15));
    });

    test('pads a day it was never given with an unknown Count, not a zero', () {
      final weeks = ContributionGridService.buildFor(
        days: [day('2024-06-15', count: 9)],
        year: 2024,
      );
      final padded = weeks
          .expand((week) => week.days)
          .firstWhere((d) => d.date != DateTime(2024, 6, 15));

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
          DateTime(previous.year, previous.month, previous.day + 1),
          reason:
              'a Duration of 24 hours is 23 or 25 across a daylight-saving '
              'boundary, which is why the lattice steps by calendar day',
        );
      }
    });

    test('places a day that falls inside daylight saving time', () {
      final weeks = ContributionGridService.buildFor(
        days: [day('2024-03-31', count: 4)],
        year: 2024,
      );

      expect(
        weeks.expand((week) => week.days).where((d) => d.count == 4),
        hasLength(1),
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
