import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/contribution_level.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:home_widget/home_widget.dart';

abstract final class CalendarWidgetService {
  static const _levelsKey = 'widget_levels';
  static const _weeksKey = 'widget_weeks';
  static const _colorsKey = 'widget_colors';
  static const _shapeKey = 'widget_shape';
  static const _usernameKey = 'widget_username';
  static const _streakKey = 'widget_streak';
  static const _totalContributionsKey = 'widget_total_contributions';

  static const _qualifiedMedium =
      'com.fbuireu.contribkit.ContribKitWidgetProvider';
  static const _qualifiedSmall =
      'com.fbuireu.contribkit.ContribKitSmallWidgetProvider';

  static Future<void> update({
    required ContributionCalendar calendar,
    required Palette palette,
    required CellShape cellShape,
    CellSize cellSize = CellSize.normal,
  }) async {
    try {
      final levels = StringBuffer();
      for (final week in calendar.weeks) {
        for (var i = 0; i < 7; i++) {
          levels.write(i < week.days.length ? week.days[i].level.index : 0);
        }
      }

      final colors = [
        for (final level in ContributionLevel.values)
          palette.colorFor(level).argb,
      ].join(',');

      await Future.wait([
        HomeWidget.saveWidgetData<String>(_levelsKey, levels.toString()),
        HomeWidget.saveWidgetData<int>(_weeksKey, calendar.weeks.length),
        HomeWidget.saveWidgetData<String>(_colorsKey, colors),
        HomeWidget.saveWidgetData<String>(_shapeKey, cellShape.name),
        HomeWidget.saveWidgetData<String>(
          _usernameKey,
          calendar.username.value,
        ),
        HomeWidget.saveWidgetData<int>(_streakKey, _calculateStreak(calendar)),
        HomeWidget.saveWidgetData<int>(
          _totalContributionsKey,
          calendar.totalContributions,
        ),
      ]);

      await Future.wait([
        HomeWidget.updateWidget(qualifiedAndroidName: _qualifiedMedium),
        HomeWidget.updateWidget(qualifiedAndroidName: _qualifiedSmall),
      ]);
    } catch (_) {}
  }

  static int _calculateStreak(ContributionCalendar calendar) {
    final today = DateTime.now();
    final todayDate = DateTime(today.year, today.month, today.day);

    final countByDate = <DateTime, int>{
      for (final week in calendar.weeks)
        for (final day in week.days)
          DateTime(day.date.year, day.date.month, day.date.day): day.count,
    };

    var cursor = todayDate;

    if ((countByDate[cursor] ?? 0) == 0) {
      cursor = _previousDay(cursor);
    }

    var streak = 0;
    while ((countByDate[cursor] ?? 0) > 0) {
      streak++;
      cursor = _previousDay(cursor);
    }

    return streak;
  }

  static DateTime _previousDay(DateTime date) =>
      DateTime(date.year, date.month, date.day - 1);
}
