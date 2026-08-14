import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/repositories/settings_repository.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:hive_flutter/hive_flutter.dart';

const _settingsBoxName = 'settings';
const _keyLastUsername = 'lastUsername';
const _keyLastYear = 'lastYear';
const _keyPaletteKey = 'paletteKey';
const _keyLegacyPaletteName = 'paletteName';
const _keyCellShape = 'cellShape';
const _keyCellSize = 'cellSize';
const _keyBackgroundPreset = 'backgroundPreset';
const _keyLegacyCardBackground = 'cardBackground';
const _keyThemeMode = 'themeMode';

final class HiveSettingsRepository implements SettingsRepository {
  Future<Box<dynamic>> get _box => Hive.openBox<dynamic>(_settingsBoxName);

  Future<T?> _read<T>(T? Function(Box<dynamic> box) read) async {
    try {
      return read(await _box);
    } catch (_) {
      return null;
    }
  }

  Future<void> _write(Future<void> Function(Box<dynamic> box) write) async {
    try {
      await write(await _box);
    } catch (e) {
      throw CacheFailure(message: e.toString());
    }
  }

  @override
  Future<Username?> getLastUsername() => _read((box) {
    final raw = box.get(_keyLastUsername) as String?;
    return raw == null ? null : Username(raw);
  });

  @override
  Future<void> saveLastUsername(Username username) =>
      _write((box) => box.put(_keyLastUsername, username.value));

  @override
  Future<Year?> getLastYear() => _read((box) {
    final raw = box.get(_keyLastYear) as int?;
    return raw == null ? null : Year(raw);
  });

  @override
  Future<void> saveLastYear(Year year) =>
      _write((box) => box.put(_keyLastYear, year.value));

  @override
  Future<String?> getSavedPaletteKey() => _read(
    (box) =>
        (box.get(_keyPaletteKey) ?? box.get(_keyLegacyPaletteName)) as String?,
  );

  @override
  Future<void> savePaletteKey(String key) => _write((box) async {
    await box.put(_keyPaletteKey, key);
    await box.delete(_keyLegacyPaletteName);
  });

  @override
  Future<CellShape?> getSavedCellShape() => _read((box) {
    final raw = box.get(_keyCellShape) as String?;
    if (raw == null) return null;
    return CellShape.values.where((s) => s.name == raw).firstOrNull;
  });

  @override
  Future<void> saveCellShape(CellShape shape) =>
      _write((box) => box.put(_keyCellShape, shape.name));

  @override
  Future<CellSize?> getSavedCellSize() => _read((box) {
    final raw = box.get(_keyCellSize) as String?;
    if (raw == null) return null;
    return CellSize.values.where((s) => s.name == raw).firstOrNull;
  });

  @override
  Future<void> saveCellSize(CellSize size) =>
      _write((box) => box.put(_keyCellSize, size.name));

  @override
  Future<String?> getSavedBackgroundPreset() => _read(
    (box) =>
        (box.get(_keyBackgroundPreset) ?? box.get(_keyLegacyCardBackground))
            as String?,
  );

  @override
  Future<void> saveBackgroundPreset(String presetName) => _write((box) async {
    await box.put(_keyBackgroundPreset, presetName);
    await box.delete(_keyLegacyCardBackground);
  });

  @override
  Future<AppThemeMode?> getThemeMode() => _read((box) {
    final raw = box.get(_keyThemeMode) as String?;
    if (raw == null) return null;
    return AppThemeMode.values.where((m) => m.name == raw).firstOrNull;
  });

  @override
  Future<void> saveThemeMode(AppThemeMode mode) =>
      _write((box) => box.put(_keyThemeMode, mode.name));
}
