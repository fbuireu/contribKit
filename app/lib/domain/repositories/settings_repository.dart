import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';

/// Mirrors [ThemeMode] from Flutter but lives in the domain to keep this
/// interface free of framework dependencies.
enum AppThemeMode { system, light, dark }

abstract interface class SettingsRepository {
  Future<Username?> getLastUsername();
  Future<void> saveLastUsername(Username username);

  Future<Year?> getLastYear();
  Future<void> saveLastYear(Year year);

  Future<String?> getSavedPaletteName();
  Future<void> savePaletteName(String name);

  Future<CellShape?> getSavedCellShape();
  Future<void> saveCellShape(CellShape shape);

  Future<CellSize?> getSavedCellSize();
  Future<void> saveCellSize(CellSize size);

  Future<String?> getSavedCardBackground();
  Future<void> saveCardBackground(String presetName);

  Future<AppThemeMode?> getThemeMode();
  Future<void> saveThemeMode(AppThemeMode mode);
}
