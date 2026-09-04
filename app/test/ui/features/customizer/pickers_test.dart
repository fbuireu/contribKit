import 'dart:async';

import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/ui/di/providers.dart';
import 'package:contribkit/ui/failure_message.dart';
import 'package:contribkit/ui/features/customizer/widgets/background_picker.dart';
import 'package:contribkit/ui/features/customizer/widgets/palette_picker.dart';
import 'package:contribkit/ui/features/customizer/widgets/setting_picker.dart';
import 'package:contribkit/ui/features/customizer/widgets/shape_picker.dart';
import 'package:contribkit/ui/features/customizer/widgets/size_picker.dart';
import 'package:contribkit/ui/theme/app_colors.dart';
import 'package:contribkit/ui/theme/background_presets.dart';
import 'package:contribkit/ui/widgets/app_tooltip.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../support/fakes.dart';
import '../../../support/fixtures.dart';
import '../../../support/harness.dart';

void main() {
  group('ShapePicker', () {
    testWidgets('offers every Cell Shape, by its label', (tester) async {
      await pumpHosted(
        tester,
        child: ShapePicker(selected: CellShape.fallback, onSelected: (_) {}),
      );

      expect(find.text('Cell shape'), findsOneWidget);
      for (final shape in CellShape.values) {
        expect(find.text(shape.label), findsOneWidget, reason: shape.name);
      }
    });

    testWidgets('reports the Cell Shape that was tapped', (tester) async {
      CellShape? chosen;

      await pumpHosted(
        tester,
        child: ShapePicker(
          selected: CellShape.square,
          onSelected: (shape) => chosen = shape,
        ),
      );
      await tester.tap(find.text(CellShape.hex.label));
      await tester.pump();

      expect(chosen, CellShape.hex);
    });
  });

  group('SizePicker', () {
    testWidgets('offers every Cell Size, by its label', (tester) async {
      await pumpHosted(
        tester,
        child: SizePicker(selected: CellSize.fallback, onSelected: (_) {}),
      );

      expect(find.text('Cell size'), findsOneWidget);
      for (final size in CellSize.values) {
        expect(find.text(size.label), findsOneWidget, reason: size.name);
      }
    });

    testWidgets('reports the Cell Size that was tapped', (tester) async {
      CellSize? chosen;

      await pumpHosted(
        tester,
        child: SizePicker(
          selected: CellSize.normal,
          onSelected: (size) => chosen = size,
        ),
      );
      await tester.tap(find.text(CellSize.large.label));
      await tester.pump();

      expect(chosen, CellSize.large);
    });
  });

  group('BackgroundPicker', () {
    testWidgets('offers one swatch per preset, each named by its tooltip', (
      tester,
    ) async {
      await pumpHosted(
        tester,
        child: BackgroundPicker(
          selected: BackgroundPreset.system,
          onSelected: (_) {},
        ),
      );

      expect(find.text('Background'), findsOneWidget);
      expect(
        find.byType(SettingSwatch),
        findsNWidgets(BackgroundPreset.values.length),
      );
      expect(
        tester
            .widgetList<AppTooltip>(find.byType(AppTooltip))
            .map((tooltip) => (tooltip.message as Text).data)
            .toList(),
        BackgroundPreset.values.map((preset) => preset.label).toList(),
      );
    });

    testWidgets(
      'paints the system preset in the card colour, not in one of its own',
      (tester) async {
        late Color card;

        await pumpHosted(
          tester,
          child: Builder(
            builder: (context) {
              card = AppColors.of(context).card;
              return BackgroundPicker(
                selected: BackgroundPreset.system,
                onSelected: (_) {},
              );
            },
          ),
        );

        final swatch = tester.widget<SettingSwatch>(
          find.byType(SettingSwatch).first,
        );

        expect(BackgroundPreset.values.first, BackgroundPreset.system);
        expect(swatch.color, card);
      },
    );

    testWidgets('reports the preset that was tapped', (tester) async {
      BackgroundPreset? chosen;
      final target = BackgroundPreset.values.last;

      await pumpHosted(
        tester,
        child: BackgroundPicker(
          selected: BackgroundPreset.system,
          onSelected: (preset) => chosen = preset,
        ),
      );
      await tester.tap(find.byType(SettingSwatch).last);
      await tester.pump();

      expect(chosen, target);
    });
  });

  group('PalettePicker', () {
    testWidgets('draws one ramp per Palette once they have loaded', (
      tester,
    ) async {
      await pumpHosted(
        tester,
        overrides: [
          paletteRepositoryProvider.overrideWithValue(
            FakePaletteRepository(
              palettes: const [testPalette, otherTestPalette],
            ),
          ),
        ],
        child: PalettePicker(selected: testPalette, onSelected: (_) {}),
      );
      await tester.pumpAndSettle();

      expect(find.text('Palette'), findsOneWidget);
      expect(find.byType(SettingSwatch), findsNWidgets(2));
      expect(
        tester
            .widgetList<AppTooltip>(find.byType(AppTooltip))
            .map((tooltip) => (tooltip.message as Text).data)
            .toList(),
        ['Nord', 'Ember'],
      );
    });

    testWidgets('hides while loading, because a flash of nothing is worse', (
      tester,
    ) async {
      await pumpHosted(
        tester,
        overrides: [
          paletteRepositoryProvider.overrideWithValue(
            FakePaletteRepository(gate: Completer<void>().future),
          ),
        ],
        child: PalettePicker(selected: testPalette, onSelected: (_) {}),
      );

      expect(find.byType(SizedBox), findsWidgets);
      expect(find.text('Palette'), findsNothing);
      expect(find.byType(SettingSwatch), findsNothing);
    });

    testWidgets('keeps its label and says why when the load fails', (
      tester,
    ) async {
      const failure = AssetFailure(asset: 'assets/palettes.json');

      await pumpHosted(
        tester,
        overrides: [
          paletteRepositoryProvider.overrideWithValue(
            FakePaletteRepository(failure: failure),
          ),
        ],
        child: PalettePicker(selected: testPalette, onSelected: (_) {}),
      );
      await tester.pumpAndSettle();

      expect(find.text('Palette'), findsOneWidget);
      expect(find.text(FailureMessage.of(failure)), findsOneWidget);
      expect(find.byType(SettingSwatch), findsNothing);
    });

    testWidgets('scrolls, because there are more Palettes than fit a row', (
      tester,
    ) async {
      await pumpHosted(
        tester,
        overrides: [
          paletteRepositoryProvider.overrideWithValue(
            FakePaletteRepository(
              palettes: const [testPalette, otherTestPalette],
            ),
          ),
        ],
        child: PalettePicker(selected: testPalette, onSelected: (_) {}),
      );
      await tester.pumpAndSettle();

      expect(find.byType(SingleChildScrollView), findsOneWidget);
      expect(find.byType(Wrap), findsNothing);
    });

    testWidgets('reports the Palette that was tapped', (tester) async {
      var chosen = testPalette;

      await pumpHosted(
        tester,
        overrides: [
          paletteRepositoryProvider.overrideWithValue(
            FakePaletteRepository(
              palettes: const [testPalette, otherTestPalette],
            ),
          ),
        ],
        child: PalettePicker(
          selected: testPalette,
          onSelected: (palette) => chosen = palette,
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byType(SettingSwatch).last);
      await tester.pump();

      expect(chosen, otherTestPalette);
    });
  });
}
