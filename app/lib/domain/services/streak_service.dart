import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/entities/contribution_day.dart';

abstract final class StreakService {
  static int currentFor({
    required ContributionCalendar calendar,
    required DateTime today,
  }) {
    final days = _daysInYear(calendar);
    if (days.isEmpty) return 0;

    final anchor = _anchorFor(days: days, today: dateOnly(today));
    if (anchor == null) return 0;

    var index = anchor;
    if (dateOnly(days[index].date) == dateOnly(today) &&
        days[index].count == 0) {
      index--;
    }

    var streak = 0;
    while (index >= 0 && days[index].count > 0) {
      streak++;
      index--;
    }
    return streak;
  }

  static List<ContributionDay> _daysInYear(ContributionCalendar calendar) =>
      calendar.weeks
          .expand((week) => week.days)
          .where((day) => day.date.year == calendar.year.value)
          .toList()
        ..sort((a, b) => a.date.compareTo(b.date));

  static int? _anchorFor({
    required List<ContributionDay> days,
    required DateTime today,
  }) {
    var index = days.length - 1;
    while (index >= 0 && dateOnly(days[index].date).isAfter(today)) {
      index--;
    }
    return index < 0 ? null : index;
  }

  static DateTime dateOnly(DateTime date) =>
      DateTime(date.year, date.month, date.day);
}
