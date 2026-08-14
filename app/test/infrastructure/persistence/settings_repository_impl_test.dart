import 'dart:io';

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

        expect(await repository.getSavedPaletteKey(), 'Tokyo Night');
      },
    );

    test('prefers the stored key over a stale legacy name', () async {
      final box = await settingsBox();
      await box.put('paletteName', 'Tokyo Night');
      await box.put('paletteKey', 'nord');

      expect(await repository.getSavedPaletteKey(), 'nord');
    });

    test('drops the legacy name once a key is saved', () async {
      final box = await settingsBox();
      await box.put('paletteName', 'Tokyo Night');

      await repository.savePaletteKey('dracula');

      expect(box.get('paletteName'), isNull);
      expect(await repository.getSavedPaletteKey(), 'dracula');
    });

    test('returns null when nothing was ever stored', () async {
      expect(await repository.getSavedPaletteKey(), isNull);
    });
  });

  group('background preset migration', () {
    test(
      'falls back to the legacy card background when no preset is stored',
      () async {
        await (await settingsBox()).put('cardBackground', 'navy');

        expect(await repository.getSavedBackgroundPreset(), 'navy');
      },
    );

    test('prefers the stored preset over a stale legacy value', () async {
      final box = await settingsBox();
      await box.put('cardBackground', 'navy');
      await box.put('backgroundPreset', 'charcoal');

      expect(await repository.getSavedBackgroundPreset(), 'charcoal');
    });

    test('drops the legacy value once a preset is saved', () async {
      final box = await settingsBox();
      await box.put('cardBackground', 'navy');

      await repository.saveBackgroundPreset('black');

      expect(box.get('cardBackground'), isNull);
      expect(await repository.getSavedBackgroundPreset(), 'black');
    });

    test('returns null when nothing was ever stored', () async {
      expect(await repository.getSavedBackgroundPreset(), isNull);
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

      expect(await repository.getSavedCellShape(), isNull);
      expect(await repository.getSavedCellSize(), isNull);
      expect(await repository.getLastYear(), isNull);
      expect(await repository.getThemeMode(), isNull);
      expect(await repository.getLastUsername(), isNull);
    });

    test('ignores an unknown enum name rather than failing', () async {
      await (await settingsBox()).put('cellShape', 'triangle');

      expect(await repository.getSavedCellShape(), isNull);
    });
  });
}
