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
  Future<List<Palette>>? _paletteLoad;

  @override
  ViewerState build() {
    Future.microtask(_loadSettings);
    return const ViewerState();
  }

  Future<void> _loadSettings() async {
    if (!ref.mounted) return;
    state = state.copyWith(isLoadingSettings: true);

    final allPalettes = await _loadPalettes();
    if (!ref.mounted) return;

    try {
      final repo = ref.read(settingsRepositoryProvider);

      final settings = await repo.load();
      if (!ref.mounted) return;
      final backgroundName = settings.backgroundPresetName;

      final resolvedPalette =
          PaletteService.resolve(
            palettes: allPalettes,
            storedKey: settings.paletteKey,
          ) ??
          state.palette;

      state = state.copyWith(
        username: settings.lastUsername,
        year: settings.lastYear,
        palette: resolvedPalette,
        cellShape: settings.cellShape,
        cellSize: settings.cellSize,
        backgroundPreset:
            (backgroundName == null
                ? null
                : BackgroundPreset.byName(backgroundName)) ??
            BackgroundPreset.fallback,
      );

      final username = settings.lastUsername;
      if (username != null) {
        await fetchContributions(username: username, year: settings.year);
      }
    } catch (_) {
    } finally {
      if (ref.mounted) state = state.copyWith(isLoadingSettings: false);
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
      if (generation != _generation || !ref.mounted) return;
      state = state.copyWith(
        calendar: calendar,
        stats: ContributionStatsService.compute(calendar),
        fromCache: fromCache,
      );
      await _remember(username: username, year: year);

      _updateWidget();
    } on Failure catch (f) {
      if (_stillOurs(generation)) state = state.copyWith(error: f);
    } catch (e) {
      if (_stillOurs(generation)) {
        state = state.copyWith(error: UnexpectedFailure(message: e.toString()));
      }
    } finally {
      if (_stillOurs(generation)) {
        state = state.copyWith(isLoadingCalendar: false);
      }
    }
  }

  bool _stillOurs(int generation) => generation == _generation && ref.mounted;

  Future<List<Palette>> _loadPalettes() =>
      _paletteLoad ??= _loadPalettesOnce().whenComplete(() {
        _paletteLoad = null;
      });

  Future<List<Palette>> _loadPalettesOnce() async {
    try {
      final palettes = await ref.read(paletteRepositoryProvider).loadAll();
      if (!ref.mounted) return palettes;
      ref.invalidate(palettesProvider);
      state = state.copyWith(
        palette: palettes.isEmpty ? null : palettes.first,
        paletteFailure: palettes.isEmpty ? _noPalettes : null,
      );
      return palettes;
    } catch (e) {
      if (ref.mounted) state = state.copyWith(paletteFailure: _asFailure(e));
      return const [];
    }
  }

  static const _noPalettes = AssetFailure(asset: 'assets/palettes.json');

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

  Future<void> _remember({
    required Username username,
    required Year year,
  }) async {
    try {
      final settings = ref.read(settingsRepositoryProvider);
      await settings.saveLastUsername(username);
      if (!ref.mounted) return;
      await settings.saveLastYear(year);
    } on Failure {
      return;
    }
  }

  Future<void> refreshContributions() async {
    final username = state.username;
    if (username == null) return;
    final year = state.effectiveYear;
    await ref.read(invalidateContributionCacheProvider)(username);
    if (!ref.mounted) return;
    await fetchContributions(username: username, year: year);
  }

  Future<void> retry() async {
    if (state.palette == null) await _loadPalettes();
    if (!ref.mounted) return;
    final username = state.username;
    if (username == null) return;
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
