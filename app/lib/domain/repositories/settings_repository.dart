import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';

enum AppThemeMode { system, light, dark }

abstract interface class SettingsRepository {
  Future<Username?> getLastUsername();
  Future<void> saveLastUsername(Username username);

  Future<Year?> getLastYear();
  Future<void> saveLastYear(Year year);

  Future<String?> getSavedPaletteKey();
  Future<void> savePaletteKey(String key);

  Future<CellShape?> getSavedCellShape();
  Future<void> saveCellShape(CellShape shape);

  Future<CellSize?> getSavedCellSize();
  Future<void> saveCellSize(CellSize size);

  Future<String?> getSavedBackgroundPreset();
  Future<void> saveBackgroundPreset(String presetName);

  Future<AppThemeMode?> getThemeMode();
  Future<void> saveThemeMode(AppThemeMode mode);
}
