import 'package:contribkit/domain/value_objects/year.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Year', () {
    test('constructs with the minimum valid year', () {
      expect(Year(Year.minYear).value, Year.minYear);
    });

    test('constructs with the current year', () {
      expect(Year.current.value, DateTime.now().year);
    });

    test('constructs with a year between min and current', () {
      expect(Year(2020).value, 2020);
    });

    test('throws for year before minYear', () {
      expect(() => Year(Year.minYear - 1), throwsA(isA<RangeError>()));
    });

    test('throws for year after current', () {
      expect(
        () => Year(DateTime.now().year + 1),
        throwsA(isA<RangeError>()),
      );
    });

    test('two instances with the same value are equal', () {
      expect(Year(2022), equals(Year(2022)));
    });

    test('two instances with different values are not equal', () {
      expect(Year(2021), isNot(equals(Year(2022))));
    });

    test('toString returns the year string', () {
      expect(Year(2022).toString(), '2022');
    });
  });
}
