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
        bestDayCount: null,
        bestDayDate: null,
        totalDaysActive: 0,
        weeklyAverage: null,
        bestMonthContributions: null,
        bestMonth: null,
      );
    }

    int longestStreak = 0;
    int run = 0;
    int bestCount = 0;
    DateTime? bestDate;
    int totalActive = 0;

    for (final day in allDays) {
      if (day.isActive) {
        run++;
        totalActive++;
        if (run > longestStreak) longestStreak = run;
        final count = day.count;
        if (count != null && count > bestCount) {
          bestCount = count;
          bestDate = day.date;
        }
      } else {
        run = 0;
      }
    }

    final weekCount = calendar.weeks.length;
    final total = calendar.totalContributions;
    final weeklyAverage = weekCount > 0 && total != null
        ? total / weekCount
        : null;

    final incomplete = allDays.any((day) => day.isActive && day.count == null);

    final monthTotals = <int, int>{};
    for (final day in allDays) {
      final count = day.count;
      if (day.isActive && count != null) {
        monthTotals[day.date.month] =
            (monthTotals[day.date.month] ?? 0) + count;
      }
    }
    int? bestMonth;
    int? bestMonthContributions;
    if (monthTotals.isNotEmpty && !incomplete) {
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
      bestDayCount: incomplete ? null : bestCount,
      bestDayDate: bestDate,
      totalDaysActive: totalActive,
      weeklyAverage: weeklyAverage,
      bestMonthContributions: bestMonthContributions,
      bestMonth: bestMonth,
    );
  }
}
