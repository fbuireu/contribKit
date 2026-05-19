import 'package:contribkit/domain/value_objects/contribution_level.dart';

// GitHub's own bucketing algorithm is not published; this matches observed behavior.
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
}
