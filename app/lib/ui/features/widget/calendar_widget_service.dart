import 'dart:io';

import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/repositories/export_repository.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/infrastructure/export/png_export_repository_impl.dart';
import 'package:home_widget/home_widget.dart';
import 'package:path_provider/path_provider.dart';

abstract final class CalendarWidgetService {
  static const _imagePathKey = 'calendar_image_path';
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
      final pngBytes = await PngExportRepository().export(
        calendar: calendar,
        options: RenderOptions(
          palette: palette,
          shape: cellShape,
          cellSize: cellSize.pixels,
          gap: cellSize.gap,
        ),
      );

      final dir = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/widget_calendar.png');
      await file.writeAsBytes(pngBytes);

      await Future.wait([
        HomeWidget.saveWidgetData<String>(_imagePathKey, file.path),
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
    } catch (_) {
      // Best-effort — never crash the app over a widget update.
    }
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

    // If today has no contributions yet, start streak check from yesterday.
    if ((countByDate[cursor] ?? 0) == 0) {
      cursor = cursor.subtract(const Duration(days: 1));
    }

    var streak = 0;
    while ((countByDate[cursor] ?? 0) > 0) {
      streak++;
      cursor = cursor.subtract(const Duration(days: 1));
    }

    return streak;
  }
}
