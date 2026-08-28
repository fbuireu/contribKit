import 'package:contribkit/domain/entities/contribution_day.dart';
import 'package:contribkit/domain/entities/contribution_week.dart';
import 'package:contribkit/domain/value_objects/contribution_level.dart';

abstract final class ContributionGridService {
  static const daysPerWeek = 7;

  static bool _isLeap(int year) =>
      (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;

  static int leadingDaysFor(int year) =>
      DateTime(year, 1, 1).weekday % daysPerWeek;

  static int weeksFor(int year) {
    final cells = leadingDaysFor(year) + (_isLeap(year) ? 366 : 365);
    return (cells + daysPerWeek - 1) ~/ daysPerWeek;
  }

  static List<ContributionWeek> buildFor({
    required List<ContributionDay> days,
    required int year,
  }) {
    final byDate = {for (final day in days) _dateOnly(day.date): day};

    final start = DateTime(year, 1, 1 - leadingDaysFor(year));
    final weekCount = weeksFor(year);

    final weeks = <ContributionWeek>[];
    for (var week = 0; week < weekCount; week++) {
      final weekDays = <ContributionDay>[];
      for (var day = 0; day < daysPerWeek; day++) {
        final date = DateTime(
          start.year,
          start.month,
          start.day + week * daysPerWeek + day,
        );
        weekDays.add(
          byDate[date] ??
              ContributionDay(
                date: date,
                count: null,
                level: ContributionLevel.none,
              ),
        );
      }
      weeks.add(ContributionWeek(days: weekDays));
    }
    return weeks;
  }

  static DateTime _dateOnly(DateTime date) =>
      DateTime(date.year, date.month, date.day);
}
