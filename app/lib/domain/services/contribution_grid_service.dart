import 'package:contribkit/domain/entities/contribution_day.dart';
import 'package:contribkit/domain/entities/contribution_week.dart';
import 'package:contribkit/domain/value_objects/contribution_level.dart';

abstract final class ContributionGridService {
  static const weeksPerYear = 53;
  static const daysPerWeek = 7;

  static List<ContributionWeek> buildFor({
    required List<ContributionDay> days,
    required int year,
  }) {
    final byDate = {for (final day in days) _dateOnly(day.date): day};

    final firstOfYear = DateTime(year, 1, 1);
    final start = DateTime(year, 1, 1 - (firstOfYear.weekday % daysPerWeek));

    final weeks = <ContributionWeek>[];
    for (var week = 0; week < weeksPerYear; week++) {
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
