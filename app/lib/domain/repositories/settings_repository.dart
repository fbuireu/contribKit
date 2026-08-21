import 'package:contribkit/domain/value_objects/app_settings.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';

export 'package:contribkit/domain/value_objects/app_settings.dart'
    show AppSettings, AppThemeMode;

abstract interface class SettingsRepository {
  Future<AppSettings> load();

  Future<void> saveLastUsername(Username username);
  Future<void> saveLastYear(Year year);
  Future<void> savePaletteKey(String key);
  Future<void> saveCellShape(CellShape shape);
  Future<void> saveCellSize(CellSize size);
  Future<void> saveBackgroundPreset(String presetName);
  Future<void> saveThemeMode(AppThemeMode mode);
}
