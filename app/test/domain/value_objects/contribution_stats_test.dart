import 'package:contribkit/domain/value_objects/contribution_stats.dart';
import 'package:flutter_test/flutter_test.dart';

ContributionStats _stats({
  int? bestDayCount,
  DateTime? bestDayDate,
  int? bestMonth,
  int? bestMonthContributions,
}) => ContributionStats(
  currentStreak: 0,
  longestStreak: 0,
  bestDayCount: bestDayCount,
  bestDayDate: bestDayDate,
  totalDaysActive: 0,
  weeklyAverage: null,
  bestMonthContributions: bestMonthContributions,
  bestMonth: bestMonth,
);

void main() {
  group(
    'a best day is one fact, so its Count and its date travel together',
    () {
      test('refuses a date with no Count beside it', () {
        expect(
          () => _stats(bestDayDate: DateTime(2024, 6, 15)),
          throwsA(isA<AssertionError>()),
          reason:
              'the stats once said the best day was 15 June and that we '
              'could not tell you how many, which is the defect this pairing prevents',
        );
      });

      test('refuses a Count with no date beside it', () {
        expect(() => _stats(bestDayCount: 40), throwsA(isA<AssertionError>()));
      });

      test('accepts both, or neither', () {
        expect(
          () => _stats(bestDayCount: 40, bestDayDate: DateTime(2024, 6, 15)),
          returnsNormally,
        );
        expect(_stats, returnsNormally);
      });
    },
  );

  group('a best month is one fact too', () {
    test('refuses a month with no total, or a total with no month', () {
      expect(() => _stats(bestMonth: 6), throwsA(isA<AssertionError>()));
      expect(
        () => _stats(bestMonthContributions: 100),
        throwsA(isA<AssertionError>()),
      );
    });

    test('bounds the month to a real one', () {
      expect(
        () => _stats(bestMonth: 13, bestMonthContributions: 100),
        throwsA(isA<AssertionError>()),
      );
    });
  });
}
