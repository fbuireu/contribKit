import 'package:contribkit/domain/services/contribution_level_service.dart';
import 'package:contribkit/domain/value_objects/contribution_level.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('ContributionLevelService.levelFor', () {
    test('returns none for zero count', () {
      expect(
        ContributionLevelService.levelFor(count: 0, yearMax: 20),
        ContributionLevel.none,
      );
    });

    test('returns low for first quarter', () {
      expect(
        ContributionLevelService.levelFor(count: 5, yearMax: 20),
        ContributionLevel.low,
      );
    });

    test('returns medium for second quarter', () {
      expect(
        ContributionLevelService.levelFor(count: 10, yearMax: 20),
        ContributionLevel.medium,
      );
    });

    test('returns high for third quarter', () {
      expect(
        ContributionLevelService.levelFor(count: 15, yearMax: 20),
        ContributionLevel.high,
      );
    });

    test('returns veryHigh for the maximum', () {
      expect(
        ContributionLevelService.levelFor(count: 20, yearMax: 20),
        ContributionLevel.veryHigh,
      );
    });

    test('returns low when yearMax is zero and count is nonzero', () {
      expect(
        ContributionLevelService.levelFor(count: 1, yearMax: 0),
        ContributionLevel.low,
      );
    });

    test('returns none when both count and yearMax are zero', () {
      expect(
        ContributionLevelService.levelFor(count: 0, yearMax: 0),
        ContributionLevel.none,
      );
    });
  });
}
