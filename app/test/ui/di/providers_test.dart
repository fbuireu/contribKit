import 'dart:async';

import 'package:contribkit/application/use_cases/export_calendar.dart';
import 'package:contribkit/application/use_cases/fetch_contributions.dart';
import 'package:contribkit/application/use_cases/fetch_tip_products.dart';
import 'package:contribkit/application/use_cases/give_tip.dart';
import 'package:contribkit/application/use_cases/invalidate_contribution_cache.dart';
import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/repositories/contribution_repository.dart';
import 'package:contribkit/domain/repositories/export_delivery_repository.dart';
import 'package:contribkit/domain/repositories/export_repository.dart';
import 'package:contribkit/domain/repositories/palette_repository.dart';
import 'package:contribkit/domain/repositories/settings_repository.dart';
import 'package:contribkit/domain/repositories/suggested_username_repository.dart';
import 'package:contribkit/domain/repositories/tip_repository.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/export_format.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/ui/di/providers.dart';
import 'package:flutter/material.dart' show ThemeMode;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/fakes.dart';
import '../../support/fixtures.dart';

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

  group('the object graph this file wires', () {
    ProviderContainer containerWith({
      FakePaletteRepository? palettes,
      FakeSuggestedUsernameRepository? usernames,
    }) {
      final container = ProviderContainer(
        overrides: [
          paletteRepositoryProvider.overrideWithValue(
            palettes ?? FakePaletteRepository(),
          ),
          suggestedUsernameRepositoryProvider.overrideWithValue(
            usernames ?? FakeSuggestedUsernameRepository(),
          ),
        ],
      );
      addTearDown(container.dispose);
      return container;
    }

    test('every repository provider hands back the domain interface', () {
      final container = containerWith();

      expect(
        container.read(paletteRepositoryProvider),
        isA<PaletteRepository>(),
      );
      expect(
        container.read(suggestedUsernameRepositoryProvider),
        isA<SuggestedUsernameRepository>(),
      );
      expect(
        container.read(contributionRepositoryProvider),
        isA<ContributionRepository>(),
      );
      expect(container.read(tipRepositoryProvider), isA<TipRepository>());
      expect(
        container.read(settingsRepositoryProvider),
        isA<SettingsRepository>(),
      );
      expect(
        container.read(exportDeliveryProvider),
        isA<ExportDeliveryRepository>(),
      );
      for (final provider in [
        svgExportRepositoryProvider,
        pngExportRepositoryProvider,
        markdownExportRepositoryProvider,
      ]) {
        expect(container.read(provider), isA<ExportRepository>());
      }
    });

    test('there is one export repository per Export Format, and no two are the same', () {
      final container = containerWith();
      final repositories = {
        container.read(svgExportRepositoryProvider),
        container.read(pngExportRepositoryProvider),
        container.read(markdownExportRepositoryProvider),
      };

      expect(repositories, hasLength(ExportFormat.values.length));
    });

    test('every use-case provider is built and reachable', () {
      final container = containerWith();

      expect(
        container.read(fetchContributionsProvider),
        isA<FetchContributions>(),
      );
      expect(
        container.read(invalidateContributionCacheProvider),
        isA<InvalidateContributionCache>(),
      );
      expect(container.read(fetchTipProductsProvider), isA<FetchTipProducts>());
      expect(container.read(giveTipProvider), isA<GiveTip>());
    });

    test('exportCalendar is one family that switches on the Export Format', () {
      final container = containerWith();

      for (final format in ExportFormat.values) {
        expect(
          container.read(exportCalendarProvider(format)),
          isA<ExportCalendar>(),
          reason: format.name,
        );
      }
    });

    test('the async providers await the repository they were given', () async {
      final container = containerWith(
        palettes: FakePaletteRepository(palettes: const [testPalette]),
        usernames: FakeSuggestedUsernameRepository(names: const ['torvalds']),
      );

      expect(await container.read(palettesProvider.future), [testPalette]);
      expect(await container.read(suggestedUsernamesProvider.future), [
        'torvalds',
      ]);
    });

    test(
      'neither async provider retries, because a bundled asset does not heal',
      () async {
        const failure = AssetFailure(asset: 'assets/palettes.json');
        final palettes = FakePaletteRepository(failure: failure);
        final container = containerWith(
          palettes: palettes,
          usernames: FakeSuggestedUsernameRepository(failure: failure),
        );

        await expectLater(
          container.read(palettesProvider.future),
          throwsA(isA<AssetFailure>()),
        );
        await expectLater(
          container.read(suggestedUsernamesProvider.future),
          throwsA(isA<AssetFailure>()),
        );
        expect(
          palettes.reads,
          1,
          reason:
              'Riverpod would otherwise re-run it ten times over about forty '
              'seconds, reporting AsyncLoading throughout',
        );
      },
    );

    test('the contribution repository is closed when its provider is', () {
      final container = ProviderContainer();
      container.read(contributionRepositoryProvider);

      expect(container.dispose, returnsNormally);
    });
  });
}
