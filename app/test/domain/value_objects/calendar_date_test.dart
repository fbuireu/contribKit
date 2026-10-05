import 'package:contribkit/domain/value_objects/calendar_date.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('CalendarDate.parse', () {
    test('reads a YYYY-MM-DD as that date at midnight UTC', () {
      final date = CalendarDate.parse('2024-03-31');

      expect(date, DateTime.utc(2024, 3, 31));
      expect(date.isUtc, isTrue);
    });

    test('reads the days of the daylight-saving switches as themselves', () {
      for (final (iso, expected) in [
        ('2024-03-31', DateTime.utc(2024, 3, 31)),
        ('2024-10-27', DateTime.utc(2024, 10, 27)),
        ('2024-03-10', DateTime.utc(2024, 3, 10)),
        ('2024-11-03', DateTime.utc(2024, 11, 3)),
        ('2018-11-04', DateTime.utc(2018, 11, 4)),
      ]) {
        expect(
          CalendarDate.parse(iso),
          expected,
          reason: '$iso, whose midnight does not exist in São Paulo',
        );
      }
    });

    test('refuses a date the calendar does not have, as the web does', () {
      for (final iso in [
        '2024-02-30',
        '2023-02-29',
        '2024-01-32',
        '2024-13-01',
        '2024-00-10',
        '2024-04-31',
      ]) {
        expect(
          () => CalendarDate.parse(iso),
          throwsFormatException,
          reason: 'parse "$iso"',
        );
      }
    });

    test('reads the leap day of a leap Year', () {
      expect(CalendarDate.parse('2024-02-29'), DateTime.utc(2024, 2, 29));
    });

    test('refuses anything but a bare YYYY-MM-DD', () {
      for (final iso in [
        '',
        '2024-1-5',
        '20240105',
        '2024-03-31T00:00:00Z',
        '2024-03-31T00:00:00',
        '2024-03-31 ',
        ' 2024-03-31',
        '2024-03-31\n',
        '31-03-2024',
        'tomorrow',
      ]) {
        expect(
          () => CalendarDate.parse(iso),
          throwsFormatException,
          reason: 'parse "$iso"',
        );
      }
    });
  });

  group('CalendarDate.tryParse', () {
    test('answers the date parse answers', () {
      expect(CalendarDate.tryParse('2024-03-31'), DateTime.utc(2024, 3, 31));
      expect(CalendarDate.tryParse('2024-02-29'), DateTime.utc(2024, 2, 29));
    });

    test('answers null where parse refuses', () {
      for (final iso in [
        '',
        '2024-1-5',
        '20240105',
        '2024-03-31T00:00:00Z',
        ' 2024-03-31',
        'tomorrow',
        '2024-02-30',
        '2023-02-29',
      ]) {
        expect(CalendarDate.tryParse(iso), isNull, reason: 'tryParse "$iso"');
      }
    });
  });

  group('CalendarDate.of', () {
    test('is the date a local instant falls on, late in the evening and early '
        'in the morning', () {
      for (final (month, day) in [
        (3, 31),
        (10, 27),
        (3, 10),
        (11, 3),
        (1, 1),
        (12, 31),
      ]) {
        for (final (hour, minute) in [
          (0, 0),
          (0, 30),
          (12, 0),
          (23, 30),
          (23, 59),
        ]) {
          final instant = DateTime(2024, month, day, hour, minute);

          expect(
            CalendarDate.of(instant),
            DateTime.utc(2024, month, day),
            reason: '$instant',
          );
        }
      }
    });

    test('reads the year, month and day the instant carries, and converts it '
        'to no zone', () {
      expect(
        CalendarDate.of(DateTime.utc(2024, 3, 31, 23, 30)),
        DateTime.utc(2024, 3, 31),
      );
      expect(
        CalendarDate.of(DateTime.utc(2024, 3, 31, 0, 30)),
        DateTime.utc(2024, 3, 31),
      );
    });

    test('names the same day parse names', () {
      expect(
        CalendarDate.of(DateTime(2024, 3, 31, 23, 30)),
        CalendarDate.parse('2024-03-31'),
      );
    });

    test('leaves a calendar date as it is', () {
      final date = CalendarDate.parse('2024-10-27');

      expect(CalendarDate.of(date), date);
    });
  });

  group('a calendar date and a local DateTime', () {
    test('are never equal, so a day is made in one way only', () {
      expect(
        CalendarDate.of(DateTime(2024, 3, 31)),
        isNot(DateTime(2024, 3, 31)),
        reason: 'isUtc is part of DateTime equality, under TZ=UTC as well',
      );
      expect(CalendarDate.parse('2024-03-31'), isNot(DateTime(2024, 3, 31)));
    });
  });
}
