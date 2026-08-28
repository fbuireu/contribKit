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

  static String? _readWithLegacy({
    required Box<dynamic> box,
    required String key,
    required String legacyKey,
  }) =>
      _tolerating(() => box.get(key) as String?) ??
      _tolerating(() => box.get(legacyKey) as String?);

  static Future<void> _writeReplacingLegacy({
    required Box<dynamic> box,
    required String key,
    required String legacyKey,
    required String value,
  }) async {
    await box.put(key, value);
    await box.delete(legacyKey);
  }

  @override
  Future<AppSettings> load() async {
    try {
      return _settingsIn(await _box);
    } catch (_) {
      return const AppSettings();
    }
  }

  static T? _tolerating<T>(T? Function() read) {
    try {
      return read();
    } catch (_) {
      return null;
    }
  }

  static AppSettings _settingsIn(Box<dynamic> box) {
    final username = _tolerating(() => box.get(_keyLastUsername) as String?);
    final year = _tolerating(() => box.get(_keyLastYear) as int?);

    return AppSettings(
      lastUsername: _tolerating(
        () => username == null ? null : Username(username),
      ),
      lastYear: _tolerating(() => year == null ? null : Year(year)),
      paletteKey: _tolerating(
        () => _readWithLegacy(
          box: box,
          key: _keyPaletteKey,
          legacyKey: _keyLegacyPaletteName,
        ),
      ),
      cellShape:
          _tolerating(
            () => _enumByName(box, _keyCellShape, CellShape.values),
          ) ??
          CellShape.fallback,
      cellSize:
          _tolerating(() => _enumByName(box, _keyCellSize, CellSize.values)) ??
          CellSize.fallback,
      backgroundPresetName: _tolerating(
        () => _readWithLegacy(
          box: box,
          key: _keyBackgroundPreset,
          legacyKey: _keyLegacyCardBackground,
        ),
      ),
      themeMode:
          _tolerating(
            () => _enumByName(box, _keyThemeMode, AppThemeMode.values),
          ) ??
          AppThemeMode.system,
    );
  }

  @override
  Future<void> saveLastUsername(Username username) =>
      _write((box) => box.put(_keyLastUsername, username.value));

  @override
  Future<void> saveLastYear(Year year) =>
      _write((box) => box.put(_keyLastYear, year.value));

  @override
  Future<void> savePaletteKey(String key) => _write(
    (box) => _writeReplacingLegacy(
      box: box,
      key: _keyPaletteKey,
      legacyKey: _keyLegacyPaletteName,
      value: key,
    ),
  );

  @override
  Future<void> saveCellShape(CellShape shape) =>
      _write((box) => box.put(_keyCellShape, shape.name));

  @override
  Future<void> saveCellSize(CellSize size) =>
      _write((box) => box.put(_keyCellSize, size.name));

  @override
  Future<void> saveBackgroundPreset(String presetName) => _write(
    (box) => _writeReplacingLegacy(
      box: box,
      key: _keyBackgroundPreset,
      legacyKey: _keyLegacyCardBackground,
      value: presetName,
    ),
  );

  @override
  Future<void> saveThemeMode(AppThemeMode mode) =>
      _write((box) => box.put(_keyThemeMode, mode.name));
}
