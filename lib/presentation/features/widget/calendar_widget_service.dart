import 'dart:io';

import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/repositories/export_repository.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/infrastructure/export/png_export_repository_impl.dart';
import 'package:home_widget/home_widget.dart';
import 'package:path_provider/path_provider.dart';

/// Renders the calendar to PNG and pushes it to the Android home screen widget.
///
/// Calls are best-effort — failures are silently swallowed so they never
/// affect the main app flow.
abstract final class CalendarWidgetService {
  static const _androidProviderName = 'ContribKitWidgetProvider';
  static const _imagePathKey = 'calendar_image_path';

  /// Updates the widget with the current calendar state.
  ///
  /// Safe to call from both the foreground app and a WorkManager background
  /// isolate — no Flutter widget tree required.
  static Future<void> update({
    required ContributionCalendar calendar,
    required Palette palette,
    required CellShape cellShape,
  }) async {
    try {
      final pngBytes = await PngExportRepository().export(
        calendar: calendar,
        options: RenderOptions(palette: palette, shape: cellShape),
      );

      final dir = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/widget_calendar.png');
      await file.writeAsBytes(pngBytes);

      await HomeWidget.saveWidgetData<String>(_imagePathKey, file.path);
      await HomeWidget.updateWidget(androidName: _androidProviderName);
    } catch (_) {
      // Widget updates are best-effort — never crash the app.
    }
  }
}
