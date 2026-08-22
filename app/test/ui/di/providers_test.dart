import 'dart:async';

import 'package:contribkit/domain/repositories/settings_repository.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/ui/di/providers.dart';
import 'package:flutter/material.dart' show ThemeMode;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

final class _SlowSettingsRepository implements SettingsRepository {
  _SlowSettingsRepository(this._gate, {this.settings = const AppSettings()});

  final Future<void> _gate;
  final AppSettings settings;
  AppThemeMode? written;

  @override
  Future<AppSettings> load() async {
    await _gate;
    return settings;
  }

  @override
  Future<void> saveThemeMode(AppThemeMode mode) async {
    written = mode;
  }

  @override
  Future<void> saveLastUsername(Username username) async {}

  @override
  Future<void> saveLastYear(Year year) async {}

  @override
  Future<void> savePaletteKey(String key) async {}

  @override
  Future<void> saveCellShape(CellShape shape) async {}

  @override
  Future<void> saveCellSize(CellSize size) async {}

  @override
  Future<void> saveBackgroundPreset(String presetName) async {}
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ThemeModeNotifier', () {
    test('adopts the stored mode when nobody has toggled yet', () async {
      final gate = Completer<void>();
      final repository = _SlowSettingsRepository(
        gate.future,
        settings: const AppSettings(themeMode: AppThemeMode.light),
      );
      final container = ProviderContainer(
        overrides: [settingsRepositoryProvider.overrideWithValue(repository)],
      );
      addTearDown(container.dispose);
      container.listen(themeModeProvider, (_, _) {});

      gate.complete();
      await Future<void>.delayed(Duration.zero);

      expect(container.read(themeModeProvider), ThemeMode.light);
    });

    test('does not revert a toggle that landed before the read did', () async {
      final gate = Completer<void>();
      final repository = _SlowSettingsRepository(gate.future);
      final container = ProviderContainer(
        overrides: [settingsRepositoryProvider.overrideWithValue(repository)],
      );
      addTearDown(container.dispose);
      container.listen(themeModeProvider, (_, _) {});

      await container.read(themeModeProvider.notifier).cycle();
      expect(container.read(themeModeProvider), ThemeMode.light);

      gate.complete();
      await Future<void>.delayed(Duration.zero);

      expect(
        container.read(themeModeProvider),
        ThemeMode.light,
        reason: 'nothing was stored, so the unconditional write of the default bounced the toggle back',
      );
      expect(repository.written, AppThemeMode.light);
    });
  });
}
