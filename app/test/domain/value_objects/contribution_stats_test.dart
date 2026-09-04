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

  group('two ContributionStats are equal when every fact in them is', () {
    ContributionStats full({
      int currentStreak = 3,
      int longestStreak = 9,
      int totalDaysActive = 40,
      double? weeklyAverage = 7.5,
      int? bestMonth = 6,
      int? bestMonthContributions = 100,
    }) => ContributionStats(
      currentStreak: currentStreak,
      longestStreak: longestStreak,
      bestDayCount: 40,
      bestDayDate: DateTime.utc(2024, 6, 15),
      totalDaysActive: totalDaysActive,
      weeklyAverage: weeklyAverage,
      bestMonthContributions: bestMonthContributions,
      bestMonth: bestMonth,
    );

    test('the same numbers compare equal and hash alike', () {
      expect(full(), full());
      expect(full().hashCode, full().hashCode);
      expect(full(), full());
    });

    test('every field is part of the answer', () {
      expect(full(currentStreak: 4), isNot(full()));
      expect(full(longestStreak: 10), isNot(full()));
      expect(full(totalDaysActive: 41), isNot(full()));
      expect(full(weeklyAverage: 7.6), isNot(full()));
      expect(full(weeklyAverage: null), isNot(full()));
      expect(
        full(bestMonth: null, bestMonthContributions: null),
        isNot(full()),
      );
      expect(full(bestMonth: 7), isNot(full()));
      expect(full(bestMonthContributions: 101), isNot(full()));
      expect(
        _stats(bestDayCount: 41, bestDayDate: DateTime.utc(2024, 6, 15)),
        isNot(_stats(bestDayCount: 40, bestDayDate: DateTime.utc(2024, 6, 15))),
      );
      expect(
        _stats(bestDayCount: 40, bestDayDate: DateTime.utc(2024, 6, 16)),
        isNot(_stats(bestDayCount: 40, bestDayDate: DateTime.utc(2024, 6, 15))),
      );
    });

    test('is not equal to something that merely looks like one', () {
      expect(full(), isNot('stats'));
    });
  });
}
