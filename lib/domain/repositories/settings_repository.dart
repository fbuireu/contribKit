import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';

/// Contract for persisting user preferences.
///
/// All values are optional — implementations return `null` when a setting
/// has not been saved yet. Callers apply sensible defaults.
abstract interface class SettingsRepository {
  /// The last username the user queried.
  Future<Username?> getLastUsername();
  Future<void> saveLastUsername(Username username);

  /// The last year the user selected.
  Future<Year?> getLastYear();
  Future<void> saveLastYear(Year year);

  /// The user's selected palette, identified by [Palette.name].
  Future<String?> getSavedPaletteName();
  Future<void> savePaletteName(String name);

  /// The user's selected cell shape.
  Future<CellShape?> getSavedCellShape();
  Future<void> saveCellShape(CellShape shape);
}
