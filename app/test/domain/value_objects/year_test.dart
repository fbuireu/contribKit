import 'package:contribkit/domain/value_objects/year.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final today = DateTime(2031, 6, 15);

  group('Year', () {
    test('constructs with the minimum valid year', () {
      expect(Year(Year.minYear, today: today).value, Year.minYear);
    });

    test('is the year of the day its caller passes as today', () {
      expect(Year.current(today: today).value, 2031);
    });

    test('constructs with a year between min and the current one', () {
      expect(Year(2020, today: today).value, 2020);
    });

    test('throws for year before minYear', () {
      expect(
        () => Year(Year.minYear - 1, today: today),
        throwsA(isA<RangeError>()),
      );
    });

    test('throws for a year after the one its caller is in', () {
      expect(() => Year(2032, today: today), throwsA(isA<RangeError>()));
    });

    test('bounds a Year by the day its caller passes, not by the clock', () {
      expect(Year(2031, today: DateTime(2031)).value, 2031);
      expect(
        () => Year(2031, today: DateTime(2030, 12, 31, 23, 59)),
        throwsA(isA<RangeError>()),
      );
    });

    test('two instances with the same value are equal', () {
      expect(Year(2022, today: today), equals(Year(2022, today: today)));
    });

    test('two instances with different values are not equal', () {
      expect(Year(2021, today: today), isNot(equals(Year(2022, today: today))));
    });

    test('toString returns the year string', () {
      expect(Year(2022, today: today).toString(), '2022');
    });
  });
}
