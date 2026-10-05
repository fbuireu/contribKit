import 'package:contribkit/domain/value_objects/contribution_level.dart';

abstract final class ContributionLevelService {
  static ContributionLevel levelFor({
    required int count,
    required int yearMax,
  }) {
    if (count == 0) return ContributionLevel.none;
    if (yearMax == 0) return ContributionLevel.low;

    final ratio = count / yearMax;
    if (ratio <= 0.25) return ContributionLevel.low;
    if (ratio <= 0.50) return ContributionLevel.medium;
    if (ratio <= 0.75) return ContributionLevel.high;
    return ContributionLevel.veryHigh;
  }

  static ContributionLevel levelOf({
    required int? storedIndex,
    required int? count,
    required int yearMax,
  }) => storedIndex == null
      ? levelFor(count: count ?? 0, yearMax: yearMax)
      : ContributionLevel.values[storedIndex.clamp(
          0,
          ContributionLevel.values.length - 1,
        )];

  static int highestCount(Iterable<int?> counts) => counts.fold(
    0,
    (highest, count) => count != null && count > highest ? count : highest,
  );
}
