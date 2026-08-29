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
  }) : assert(
         (bestDayCount == null) == (bestDayDate == null),
         'A best day is one fact: a Count with no date, or a date with no '
         'Count, is half an answer and was shipped once',
       ),
       assert(
         (bestMonth == null) == (bestMonthContributions == null),
         'A best month is one fact, the same way a best day is',
       ),
       assert(
         bestMonth == null || (bestMonth >= 1 && bestMonth <= 12),
         'A best month is a calendar month',
       );

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
