import 'package:contribkit/domain/value_objects/contribution_level.dart';

/// Maps raw contribution counts to [ContributionLevel] buckets.
///
/// GitHub's own algorithm is not published, but this implementation matches
/// observed behavior: the four non-zero levels are distributed over the
/// practical max count for the year, giving a consistent visual result.
abstract final class ContributionLevelService {
  /// Buckets [count] into one of the five [ContributionLevel] values.
  ///
  /// [yearMax] is the highest single-day count for the given year;
  /// passing the true max ensures the buckets scale with the user's activity.
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
