import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/services/streak_service.dart';
import 'package:contribkit/domain/value_objects/contribution_stats.dart';

abstract final class ContributionStatsService {
  static ContributionStats compute(
    ContributionCalendar calendar, {
    DateTime? today,
  }) {
    final allDays = calendar.weeks.expand((w) => w.days).toList()
      ..sort((a, b) => a.date.compareTo(b.date));

    if (allDays.isEmpty) {
      return const ContributionStats(
        currentStreak: 0,
        longestStreak: 0,
        bestDayCount: 0,
        bestDayDate: null,
        totalDaysActive: 0,
        weeklyAverage: 0,
        bestMonthContributions: 0,
        bestMonth: null,
      );
    }

    int longestStreak = 0;
    int run = 0;
    int bestCount = 0;
    DateTime? bestDate;
    int totalActive = 0;

    for (final day in allDays) {
      if (day.count > 0) {
        run++;
        totalActive++;
        if (run > longestStreak) longestStreak = run;
        if (day.count > bestCount) {
          bestCount = day.count;
          bestDate = day.date;
        }
      } else {
        run = 0;
      }
    }

    final weekCount = calendar.weeks.length;
    final weeklyAverage = weekCount > 0
        ? calendar.totalContributions / weekCount
        : 0.0;

    final monthTotals = <int, int>{};
    for (final day in allDays) {
      if (day.count > 0) {
        monthTotals[day.date.month] =
            (monthTotals[day.date.month] ?? 0) + day.count;
      }
    }
    int? bestMonth;
    int bestMonthContributions = 0;
    if (monthTotals.isNotEmpty) {
      final best = monthTotals.entries.reduce(
        (a, b) => a.value >= b.value ? a : b,
      );
      bestMonth = best.key;
      bestMonthContributions = best.value;
    }

    return ContributionStats(
      currentStreak: StreakService.currentFor(
        calendar: calendar,
        today: today ?? DateTime.now(),
      ),
      longestStreak: longestStreak,
      bestDayCount: bestCount,
      bestDayDate: bestDate,
      totalDaysActive: totalActive,
      weeklyAverage: weeklyAverage,
      bestMonthContributions: bestMonthContributions,
      bestMonth: bestMonth,
    );
  }
}
