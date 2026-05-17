import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/repositories/settings_repository.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:hive_flutter/hive_flutter.dart';

const _settingsBoxName = 'settings';
const _keyLastUsername = 'lastUsername';
const _keyLastYear = 'lastYear';
const _keyPaletteName = 'paletteName';
const _keyCellShape = 'cellShape';

/// Hive-backed implementation of [SettingsRepository].
final class HiveSettingsRepository implements SettingsRepository {
  Future<Box<dynamic>> get _box => Hive.openBox<dynamic>(_settingsBoxName);

  @override
  Future<Username?> getLastUsername() async {
    final raw = (await _box).get(_keyLastUsername) as String?;
    if (raw == null) return null;
    try {
      return Username(raw);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<void> saveLastUsername(Username username) async {
    try {
      await (await _box).put(_keyLastUsername, username.value);
    } catch (e) {
      throw CacheFailure(message: e.toString());
    }
  }

  @override
  Future<Year?> getLastYear() async {
    final raw = (await _box).get(_keyLastYear) as int?;
    if (raw == null) return null;
    try {
      return Year(raw);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<void> saveLastYear(Year year) async {
    try {
      await (await _box).put(_keyLastYear, year.value);
    } catch (e) {
      throw CacheFailure(message: e.toString());
    }
  }

  @override
  Future<String?> getSavedPaletteName() async =>
      (await _box).get(_keyPaletteName) as String?;

  @override
  Future<void> savePaletteName(String name) async {
    try {
      await (await _box).put(_keyPaletteName, name);
    } catch (e) {
      throw CacheFailure(message: e.toString());
    }
  }

  @override
  Future<CellShape?> getSavedCellShape() async {
    final raw = (await _box).get(_keyCellShape) as String?;
    if (raw == null) return null;
    return CellShape.values.where((s) => s.name == raw).firstOrNull;
  }

  @override
  Future<void> saveCellShape(CellShape shape) async {
    try {
      await (await _box).put(_keyCellShape, shape.name);
    } catch (e) {
      throw CacheFailure(message: e.toString());
    }
  }
}
