final class ContributionStats {
  const ContributionStats({
    required this.currentStreak,
    required this.longestStreak,
    required this.bestDayCount,
    required this.bestDayDate,
    required this.totalDaysActive,
    required this.weeklyAverage,
    required this.bestMonthContributions,
    required this.bestMonthIndex,
  });

  final int currentStreak;
  final int longestStreak;
  final int bestDayCount;
  final DateTime? bestDayDate;
  final int totalDaysActive;
  final double weeklyAverage;
  final int bestMonthContributions;

  /// 1-based month index; null when there are no contributions.
  final int? bestMonthIndex;
}
