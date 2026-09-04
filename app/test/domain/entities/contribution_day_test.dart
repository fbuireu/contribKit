import 'package:contribkit/domain/entities/contribution_day.dart';
import 'package:contribkit/domain/entities/contribution_week.dart';
import 'package:contribkit/domain/value_objects/contribution_level.dart';
import 'package:flutter_test/flutter_test.dart';

ContributionDay _day({
  int? count = 3,
  ContributionLevel level = ContributionLevel.low,
  int day = 1,
}) => ContributionDay(
  date: DateTime.utc(2024, 6, day),
  count: count,
  level: level,
);

void main() {
  group('ContributionDay', () {
    test('is active whenever GitHub gave it a level above none', () {
      for (final level in ContributionLevel.values) {
        expect(
          _day(level: level).isActive,
          level != ContributionLevel.none,
          reason: 'level $level',
        );
      }
    });

    test('an unknown Count is not zero, and stays unknown', () {
      final unknown = _day(count: null, level: ContributionLevel.high);

      expect(unknown.count, isNull);
      expect(
        unknown.isActive,
        isTrue,
        reason: 'the level is what GitHub said, and it does not need the Count',
      );
    });

    test('the date, the Count and the level together decide equality', () {
      expect(_day(), _day());
      expect(_day().hashCode, _day().hashCode);
      expect(_day(day: 2), isNot(_day()));
      expect(_day(count: 4), isNot(_day()));
      expect(_day(level: ContributionLevel.high), isNot(_day()));
      expect(_day(count: null), isNot(_day()));
    });

    test('is not equal to something that merely looks like one', () {
      expect(_day(), isNot('2024-06-01'));
    });
  });

  group('ContributionWeek', () {
    test('refuses to be mutated after it is built', () {
      final week = ContributionWeek(days: [_day()]);

      expect(week.days.clear, throwsUnsupportedError);
    });

    test('two weeks with the same days in the same order are equal', () {
      final left = ContributionWeek(days: [_day(day: 1), _day(day: 2)]);
      final right = ContributionWeek(days: [_day(day: 1), _day(day: 2)]);

      expect(left, right);
      expect(left.hashCode, right.hashCode);
    });

    test('order matters, and so does length', () {
      final week = ContributionWeek(days: [_day(day: 1), _day(day: 2)]);

      expect(ContributionWeek(days: [_day(day: 2), _day(day: 1)]), isNot(week));
      expect(ContributionWeek(days: [_day(day: 1)]), isNot(week));
    });

    test('is not equal to something that merely looks like one', () {
      expect(ContributionWeek(days: [_day()]), isNot([_day()]));
    });
  });
}
