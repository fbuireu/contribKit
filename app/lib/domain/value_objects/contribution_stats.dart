final class ContributionStats {
  const ContributionStats({
    required this.currentStreak,
    required this.longestStreak,
    required this.bestDayCount,
    required this.bestDayDate,
    required this.totalDaysActive,
    required this.weeklyAverage,
    required this.bestMonthContributions,
    required this.bestMonth,
  });

  final int currentStreak;
  final int longestStreak;
  final int? bestDayCount;
  final DateTime? bestDayDate;
  final int totalDaysActive;
  final double? weeklyAverage;
  final int? bestMonthContributions;

  final int? bestMonth;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ContributionStats &&
          currentStreak == other.currentStreak &&
          longestStreak == other.longestStreak &&
          bestDayCount == other.bestDayCount &&
          bestDayDate == other.bestDayDate &&
          totalDaysActive == other.totalDaysActive &&
          weeklyAverage == other.weeklyAverage &&
          bestMonthContributions == other.bestMonthContributions &&
          bestMonth == other.bestMonth;

  @override
  int get hashCode => Object.hash(
    currentStreak,
    longestStreak,
    bestDayCount,
    bestDayDate,
    totalDaysActive,
    weeklyAverage,
    bestMonthContributions,
    bestMonth,
  );
}
