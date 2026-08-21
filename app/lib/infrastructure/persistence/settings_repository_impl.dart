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

  static T? _enumByName<T extends Enum>(
    Box<dynamic> box,
    String key,
    List<T> values,
  ) {
    final raw = box.get(key) as String?;
    if (raw == null) return null;
    return values.where((value) => value.name == raw).firstOrNull;
  }

  static String? _readWithLegacy(
    Box<dynamic> box,
    String key,
    String legacyKey,
  ) => (box.get(key) ?? box.get(legacyKey)) as String?;

  static Future<void> _writeReplacingLegacy(
    Box<dynamic> box,
    String key,
    String legacyKey,
    String value,
  ) async {
    await box.put(key, value);
    await box.delete(legacyKey);
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
    (box) => _readWithLegacy(box, _keyPaletteKey, _keyLegacyPaletteName),
  );

  @override
  Future<void> savePaletteKey(String key) => _write(
    (box) =>
        _writeReplacingLegacy(box, _keyPaletteKey, _keyLegacyPaletteName, key),
  );

  @override
  Future<CellShape?> getSavedCellShape() =>
      _read((box) => _enumByName(box, _keyCellShape, CellShape.values));

  @override
  Future<void> saveCellShape(CellShape shape) =>
      _write((box) => box.put(_keyCellShape, shape.name));

  @override
  Future<CellSize?> getSavedCellSize() =>
      _read((box) => _enumByName(box, _keyCellSize, CellSize.values));

  @override
  Future<void> saveCellSize(CellSize size) =>
      _write((box) => box.put(_keyCellSize, size.name));

  @override
  Future<String?> getSavedBackgroundPreset() => _read(
    (box) =>
        _readWithLegacy(box, _keyBackgroundPreset, _keyLegacyCardBackground),
  );

  @override
  Future<void> saveBackgroundPreset(String presetName) => _write(
    (box) => _writeReplacingLegacy(
      box,
      _keyBackgroundPreset,
      _keyLegacyCardBackground,
      presetName,
    ),
  );

  @override
  Future<AppThemeMode?> getThemeMode() =>
      _read((box) => _enumByName(box, _keyThemeMode, AppThemeMode.values));

  @override
  Future<void> saveThemeMode(AppThemeMode mode) =>
      _write((box) => box.put(_keyThemeMode, mode.name));
}
