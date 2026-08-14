import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/ui/features/widget/home_screen_widget_payload.dart';
import 'package:home_widget/home_widget.dart';

abstract final class CalendarWidgetService {
  static const _qualifiedMedium =
      'com.fbuireu.contribkit.ContribKitWidgetProvider';
  static const _qualifiedSmall =
      'com.fbuireu.contribkit.ContribKitSmallWidgetProvider';

  static Future<void> update({
    required ContributionCalendar calendar,
    required Palette palette,
    required CellShape cellShape,
  }) async {
    final payload = HomeScreenWidgetPayload.from(
      calendar: calendar,
      palette: palette,
      cellShape: cellShape,
      today: DateTime.now(),
    );

    try {
      await Future.wait([
        HomeWidget.saveWidgetData<String>(
          HomeScreenWidgetKey.levels,
          payload.levels,
        ),
        HomeWidget.saveWidgetData<int>(
          HomeScreenWidgetKey.weeks,
          payload.weeks,
        ),
        HomeWidget.saveWidgetData<String>(
          HomeScreenWidgetKey.colors,
          payload.colors,
        ),
        HomeWidget.saveWidgetData<String>(
          HomeScreenWidgetKey.shape,
          payload.shape,
        ),
        HomeWidget.saveWidgetData<String>(
          HomeScreenWidgetKey.username,
          payload.username,
        ),
        HomeWidget.saveWidgetData<int>(
          HomeScreenWidgetKey.streak,
          payload.streak,
        ),
        HomeWidget.saveWidgetData<String>(
          HomeScreenWidgetKey.totalContributions,
          payload.totalContributionsText,
        ),
      ]);

      await Future.wait([
        HomeWidget.updateWidget(qualifiedAndroidName: _qualifiedMedium),
        HomeWidget.updateWidget(qualifiedAndroidName: _qualifiedSmall),
      ]);
    } catch (_) {}
  }
}
