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

  group('ContributionLevelService.levelOf', () {
    test('keeps the level it was stored with, whatever the Count says', () {
      expect(
        ContributionLevelService.levelOf(
          storedIndex: ContributionLevel.high.index,
          count: 1,
          yearMax: 100,
        ),
        ContributionLevel.high,
      );
      expect(
        ContributionLevelService.levelOf(
          storedIndex: ContributionLevel.none.index,
          count: 100,
          yearMax: 100,
        ),
        ContributionLevel.none,
      );
    });

    test('clamps a stored index that names no level into the enum', () {
      expect(
        ContributionLevelService.levelOf(
          storedIndex: -3,
          count: null,
          yearMax: 0,
        ),
        ContributionLevel.none,
      );
      expect(
        ContributionLevelService.levelOf(
          storedIndex: 9,
          count: null,
          yearMax: 0,
        ),
        ContributionLevel.veryHigh,
      );
    });

    test('derives the level from the Count when none was stored', () {
      expect(
        ContributionLevelService.levelOf(
          storedIndex: null,
          count: 10,
          yearMax: 20,
        ),
        ContributionLevel.medium,
      );
    });

    test('derives none from a Count nobody could read', () {
      expect(
        ContributionLevelService.levelOf(
          storedIndex: null,
          count: null,
          yearMax: 20,
        ),
        ContributionLevel.none,
      );
    });
  });

  group('ContributionLevelService.highestCount', () {
    test('is the largest Count, skipping the ones nobody could read', () {
      expect(ContributionLevelService.highestCount([3, null, 9, 1]), 9);
    });

    test('is zero when there is no Count to be the highest', () {
      expect(ContributionLevelService.highestCount(const []), 0);
      expect(ContributionLevelService.highestCount(const [null, null]), 0);
    });
  });
}
