import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/repositories/contribution_repository.dart';
import 'package:contribkit/domain/repositories/palette_repository.dart';
import 'package:contribkit/domain/repositories/settings_repository.dart';
import 'package:contribkit/domain/services/palette_service.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/ui/features/widget/calendar_widget_service.dart';

typedef HomeScreenWidgetWriter = Future<void> Function({
  required ContributionCalendar calendar,
  required Palette palette,
  required CellShape cellShape,
});

final class HomeScreenWidgetRefresh {
  const HomeScreenWidgetRefresh({
    required this._settings,
    required this._palettes,
    required this._contributions,
    this._write = CalendarWidgetService.update,
  });

  final SettingsRepository _settings;
  final PaletteRepository _palettes;
  final ContributionRepository _contributions;
  final HomeScreenWidgetWriter _write;

  Future<void> call() async {
    final username = await _settings.getLastUsername();
    if (username == null) return;

    final palette = PaletteService.resolve(
      palettes: await _palettes.loadAll(),
      storedKey: await _settings.getSavedPaletteKey(),
    );
    if (palette == null) return;

    final year = await _settings.getLastYear() ?? Year.current;
    final (:calendar, fromCache: _) = await _contributions.fetchCalendar(
      username: username,
      year: year,
    );

    await _write(
      calendar: calendar,
      palette: palette,
      cellShape: await _settings.getSavedCellShape() ?? CellShape.fallback,
    );
  }
}
