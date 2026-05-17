import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/presentation/di/providers.dart';
import 'package:contribkit/presentation/features/viewer/viewer_state.dart';
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

      state = state.copyWith(
        username: username,
        year: year,
        palette: paletteName != null ? Palettes.byName(paletteName) : null,
        cellShape: shape ?? CellShape.rounded,
      );

      if (username != null) {
        await fetchContributions(username: username, year: year ?? Year.current);
      }
    } finally {
      state = state.copyWith(isLoadingSettings: false);
    }
  }

  Future<void> fetchContributions({
    required Username username,
    required Year year,
  }) async {
    state = state.copyWith(username: username, year: year, calendar: null);

    final useCase = ref.read(fetchContributionsProvider);

    final (:calendar, :fromCache) = await useCase(
      username: username,
      year: year,
    );

    state = state.copyWith(calendar: calendar, fromCache: fromCache);

    await ref.read(settingsRepositoryProvider).saveLastUsername(username);
    await ref.read(settingsRepositoryProvider).saveLastYear(year);
  }

  void setPalette(Palette palette) {
    state = state.copyWith(palette: palette);
    ref.read(settingsRepositoryProvider).savePaletteName(palette.name);
  }

  void setCellShape(CellShape shape) {
    state = state.copyWith(cellShape: shape);
    ref.read(settingsRepositoryProvider).saveCellShape(shape);
  }

  void setYear(Year year) {
    final username = state.username;
    if (username != null) {
      fetchContributions(username: username, year: year);
    }
  }
}
