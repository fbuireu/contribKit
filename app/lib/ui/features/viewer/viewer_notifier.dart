import 'package:contribkit/domain/services/contribution_stats_service.dart';
import 'package:contribkit/domain/services/palette_service.dart';
import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/ui/di/providers.dart';
import 'package:contribkit/ui/features/viewer/viewer_state.dart';
import 'package:contribkit/ui/features/widget/calendar_widget_service.dart';
import 'package:contribkit/ui/theme/background_presets.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'viewer_notifier.g.dart';

@riverpod
class ViewerNotifier extends _$ViewerNotifier {
  int _generation = 0;

  @override
  ViewerState build() {
    Future.microtask(_loadSettings);
    return const ViewerState();
  }

  Future<void> _loadSettings() async {
    state = state.copyWith(isLoadingSettings: true);

    List<Palette> allPalettes = [];
    try {
      allPalettes = await ref.read(palettesProvider.future);
      state = state.copyWith(
        palette: allPalettes.isEmpty ? null : allPalettes.first,
        paletteFailure: null,
      );
    } catch (e) {
      state = state.copyWith(paletteFailure: _asFailure(e));
    }

    try {
      final repo = ref.read(settingsRepositoryProvider);

      final username = await repo.getLastUsername();
      final year = await repo.getLastYear();
      final paletteKey = await repo.getSavedPaletteKey();
      final shape = await repo.getSavedCellShape();
      final cellSizeSaved = await repo.getSavedCellSize();
      final backgroundName = await repo.getSavedBackgroundPreset();

      final resolvedPalette =
          PaletteService.resolve(
            palettes: allPalettes,
            storedKey: paletteKey,
          ) ??
          state.palette;

      state = state.copyWith(
        username: username,
        year: year,
        palette: resolvedPalette,
        cellShape: shape ?? CellShape.fallback,
        cellSize: cellSizeSaved ?? CellSize.fallback,
        backgroundPreset: backgroundName != null
            ? BackgroundPresets.byName(backgroundName)
            : BackgroundPreset.system,
      );

      if (username != null) {
        await fetchContributions(
          username: username,
          year: year ?? Year.current,
        );
      }
    } catch (_) {
    } finally {
      state = state.copyWith(isLoadingSettings: false);
    }
  }

  Future<void> fetchContributions({
    required Username username,
    required Year year,
  }) async {
    final generation = ++_generation;
    state = state.copyWith(
      username: username,
      year: year,
      calendar: null,
      stats: null,
      error: null,
      isLoadingCalendar: true,
    );

    try {
      final useCase = ref.read(fetchContributionsProvider);
      final (:calendar, :fromCache) = await useCase(
        username: username,
        year: year,
      );
      if (generation != _generation) return;
      state = state.copyWith(
        calendar: calendar,
        stats: ContributionStatsService.compute(calendar),
        fromCache: fromCache,
      );
      await ref.read(settingsRepositoryProvider).saveLastUsername(username);
      await ref.read(settingsRepositoryProvider).saveLastYear(year);

      _updateWidget();
    } on Failure catch (f) {
      if (generation == _generation) state = state.copyWith(error: f);
    } catch (e) {
      if (generation == _generation) {
        state = state.copyWith(error: UnexpectedFailure(message: e.toString()));
      }
    } finally {
      if (generation == _generation) {
        state = state.copyWith(isLoadingCalendar: false);
      }
    }
  }

  static Failure _asFailure(Object error) =>
      error is Failure ? error : UnexpectedFailure(message: error.toString());

  void setPalette(Palette palette) {
    state = state.copyWith(palette: palette);
    ref.read(settingsRepositoryProvider).savePaletteKey(palette.key);
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

  void setBackgroundPreset(BackgroundPreset bg) {
    state = state.copyWith(backgroundPreset: bg);
    ref.read(settingsRepositoryProvider).saveBackgroundPreset(bg.name);
  }

  void setYear(Year year) {
    final username = state.username;
    if (username != null) {
      fetchContributions(username: username, year: year);
    } else {
      state = state.copyWith(year: year);
    }
  }

  Future<void> refreshContributions() async {
    final username = state.username;
    if (username == null) return;
    await ref.read(invalidateContributionCacheProvider)(username);
    await fetchContributions(username: username, year: state.effectiveYear);
  }

  void _updateWidget() {
    final calendar = state.calendar;
    final palette = state.palette;
    if (calendar == null || palette == null) return;
    CalendarWidgetService.update(
      calendar: calendar,
      palette: palette,
      cellShape: state.cellShape,
    );
  }
}
