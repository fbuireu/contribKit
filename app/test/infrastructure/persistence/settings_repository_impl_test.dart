import 'dart:io';

import 'package:contribkit/domain/repositories/settings_repository.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/infrastructure/persistence/settings_repository_impl.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_flutter/hive_flutter.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory hiveDir;
  late HiveSettingsRepository repository;

  Future<Box<dynamic>> settingsBox() => Hive.openBox<dynamic>('settings');

  setUp(() async {
    hiveDir = await Directory.systemTemp.createTemp('contribkit_settings_test');
    Hive.init(hiveDir.path);
    repository = HiveSettingsRepository();
  });

  tearDown(() async {
    await Hive.close();
    if (hiveDir.existsSync()) await hiveDir.delete(recursive: true);
  });

  group('palette key migration', () {
    test(
      'falls back to the legacy palette name when no key is stored',
      () async {
        await (await settingsBox()).put('paletteName', 'Tokyo Night');

        expect((await repository.load()).paletteKey, 'Tokyo Night');
      },
    );

    test('prefers the stored key over a stale legacy name', () async {
      final box = await settingsBox();
      await box.put('paletteName', 'Tokyo Night');
      await box.put('paletteKey', 'nord');

      expect((await repository.load()).paletteKey, 'nord');
    });

    test('drops the legacy name once a key is saved', () async {
      final box = await settingsBox();
      await box.put('paletteName', 'Tokyo Night');

      await repository.savePaletteKey('dracula');

      expect(box.get('paletteName'), isNull);
      expect((await repository.load()).paletteKey, 'dracula');
    });

    test('returns null when nothing was ever stored', () async {
      expect((await repository.load()).paletteKey, isNull);
    });
  });

  group('background preset migration', () {
    test(
      'falls back to the legacy card background when no preset is stored',
      () async {
        await (await settingsBox()).put('cardBackground', 'navy');

        expect((await repository.load()).backgroundPresetName, 'navy');
      },
    );

    test('prefers the stored preset over a stale legacy value', () async {
      final box = await settingsBox();
      await box.put('cardBackground', 'navy');
      await box.put('backgroundPreset', 'charcoal');

      expect((await repository.load()).backgroundPresetName, 'charcoal');
    });

    test('drops the legacy value once a preset is saved', () async {
      final box = await settingsBox();
      await box.put('cardBackground', 'navy');

      await repository.saveBackgroundPreset('black');

      expect(box.get('cardBackground'), isNull);
      expect((await repository.load()).backgroundPresetName, 'black');
    });

    test('returns null when nothing was ever stored', () async {
      expect((await repository.load()).backgroundPresetName, isNull);
    });
  });

  group('reading a value stored in the wrong shape', () {
    test('degrades to unset instead of throwing', () async {
      final box = await settingsBox();
      await box.put('cellShape', 0);
      await box.put('cellSize', 3);
      await box.put('lastYear', 'not a year');
      await box.put('themeMode', false);
      await box.put('lastUsername', 42);

      final settings = await repository.load();

      expect(settings.cellShape, CellShape.fallback);
      expect(settings.cellSize, CellSize.fallback);
      expect(settings.lastYear, isNull);
      expect(settings.themeMode, AppThemeMode.system);
      expect(settings.lastUsername, isNull);
    });

    test('ignores an unknown enum name rather than failing', () async {
      await (await settingsBox()).put('cellShape', 'triangle');

      expect((await repository.load()).cellShape, CellShape.fallback);
    });

    test('loses only the corrupt value, not every setting beside it', () async {
      final box = await settingsBox();
      await box.put('cellShape', 0);
      await box.put('paletteKey', 'nord');
      await box.put('lastUsername', 'torvalds');
      await box.put('cellSize', 'large');

      final settings = await repository.load();

      expect(settings.cellShape, CellShape.fallback);
      expect(settings.paletteKey, 'nord');
      expect(settings.lastUsername?.value, 'torvalds');
      expect(settings.cellSize, CellSize.large);
    });
  });
}
