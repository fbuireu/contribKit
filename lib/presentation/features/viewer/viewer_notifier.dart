import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/presentation/di/providers.dart';
import 'package:contribkit/presentation/features/viewer/viewer_state.dart';
import 'package:contribkit/presentation/features/widget/calendar_widget_service.dart';
import 'package:contribkit/presentation/theme/background_presets.dart';
import 'package:contribkit/presentation/theme/palettes.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'viewer_notifier.g.dart';

@riverpod
class ViewerNotifier extends _$ViewerNotifier {
  @override
  ViewerState build() {
    Future.microtask(_loadSettings);
    return const ViewerState();
  }

  Future<void> _loadSettings() async {
    state = state.copyWith(isLoadingSettings: true);
    try {
      final repo = ref.read(settingsRepositoryProvider);

      final username = await repo.getLastUsername();
      final year = await repo.getLastYear();
      final paletteName = await repo.getSavedPaletteName();
      final shape = await repo.getSavedCellShape();
      final cellSizeSaved = await repo.getSavedCellSize();
      final backgroundName = await repo.getSavedCardBackground();

      state = state.copyWith(
        username: username,
        year: year,
        palette: paletteName != null ? Palettes.byName(paletteName) : null,
        cellShape: shape ?? CellShape.rounded,
        cellSize: cellSizeSaved ?? CellSize.normal,
        cardBackground: backgroundName != null
            ? BackgroundPresets.byName(backgroundName)
            : BackgroundPreset.system,
      );

      if (username != null) {
        await fetchContributions(
          username: username,
          year: year ?? Year.current,
        );
      }
    } finally {
      state = state.copyWith(isLoadingSettings: false);
    }
  }

  Future<void> fetchContributions({
    required Username username,
    required Year year,
  }) async {
    state = state.copyWith(
      username: username,
      year: year,
      calendar: null,
      error: null,
      isLoadingCalendar: true,
    );

    try {
      final useCase = ref.read(fetchContributionsProvider);
      final (:calendar, :fromCache) = await useCase(
        username: username,
        year: year,
      );
      state = state.copyWith(calendar: calendar, fromCache: fromCache);
      await ref.read(settingsRepositoryProvider).saveLastUsername(username);
      await ref.read(settingsRepositoryProvider).saveLastYear(year);

      CalendarWidgetService.update(
        calendar: calendar,
        palette: state.effectivePalette,
        cellShape: state.cellShape,
        cellSize: state.cellSize,
      );
    } on Failure catch (f) {
      state = state.copyWith(error: f);
    } catch (e) {
      state = state.copyWith(error: UnexpectedFailure(message: e.toString()));
    } finally {
      state = state.copyWith(isLoadingCalendar: false);
    }
  }

  void setPalette(Palette palette) {
    state = state.copyWith(palette: palette);
    ref.read(settingsRepositoryProvider).savePaletteName(palette.name);
    _updateWidget();
  }

  void setCellShape(CellShape shape) {
    state = state.copyWith(cellShape: shape);
    ref.read(settingsRepositoryProvider).saveCellShape(shape);
    _updateWidget();
  }

  void setCellSize(CellSize size) {
    state = state.copyWith(cellSize: size);
    ref.read(settingsRepositoryProvider).saveCellSize(size);
    _updateWidget();
  }

  void setCardBackground(BackgroundPreset bg) {
    state = state.copyWith(cardBackground: bg);
    ref.read(settingsRepositoryProvider).saveCardBackground(bg.name);
  }

  void setYear(Year year) {
    final username = state.username;
    if (username != null) {
      fetchContributions(username: username, year: year);
    }
  }

  Future<void> refreshContributions() async {
    final username = state.username;
    if (username == null) return;
    await ref.read(contributionRepositoryProvider).invalidateCache(username);
    await fetchContributions(username: username, year: state.effectiveYear);
  }

  void _updateWidget() {
    final calendar = state.calendar;
    if (calendar == null) return;
    CalendarWidgetService.update(
      calendar: calendar,
      palette: state.effectivePalette,
      cellShape: state.cellShape,
      cellSize: state.cellSize,
    );
  }
}
