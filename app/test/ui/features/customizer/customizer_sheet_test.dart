import 'package:contribkit/domain/value_objects/app_settings.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/ui/features/customizer/customizer_sheet.dart';
import 'package:contribkit/ui/features/customizer/widgets/background_picker.dart';
import 'package:contribkit/ui/features/customizer/widgets/palette_picker.dart';
import 'package:contribkit/ui/features/customizer/widgets/setting_picker.dart';
import 'package:contribkit/ui/features/customizer/widgets/shape_picker.dart';
import 'package:contribkit/ui/features/customizer/widgets/size_picker.dart';
import 'package:contribkit/ui/features/viewer/widgets/contribution_grid.dart';
import 'package:contribkit/ui/theme/background_presets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../support/fakes.dart';
import '../../../support/fixtures.dart';
import '../../../support/harness.dart';

Future<FakeSettingsRepository> _openCustomizer(
  WidgetTester tester, {
  bool withCalendar = true,
}) async {
  final settings = FakeSettingsRepository(
    settings: withCalendar
        ? AppSettings(lastUsername: Username('octocat'), lastYear: Year(2024))
        : const AppSettings(),
  );

  await pumpSheet(
    tester,
    overrides: appOverrides(
      settings: settings,
      palettes: FakePaletteRepository(
        palettes: const [testPalette, otherTestPalette],
      ),
      contributions: FakeContributionRepository(answer: testCalendar(weeks: 3)),
    ),
    builder: (_) => const CustomizerSheet(),
  );

  return settings;
}

void main() {
  group('CustomizerSheet', () {
    testWidgets('offers all four settings, every time', (tester) async {
      await _openCustomizer(tester);

      expect(find.text('Customize'), findsOneWidget);
      expect(find.byType(PalettePicker), findsOneWidget);
      expect(find.byType(ShapePicker), findsOneWidget);
      expect(find.byType(SizePicker), findsOneWidget);
      expect(find.byType(BackgroundPicker), findsOneWidget);
    });

    testWidgets('previews the calendar the Viewer is showing', (tester) async {
      await _openCustomizer(tester);

      expect(find.byType(ContributionGrid), findsOneWidget);
    });

    testWidgets(
      'drops the preview, not the pickers, when there is no calendar',
      (tester) async {
        await _openCustomizer(tester, withCalendar: false);

        expect(find.byType(ContributionGrid), findsNothing);
        expect(find.byType(ShapePicker), findsOneWidget);
        expect(find.byType(SizePicker), findsOneWidget);
        expect(find.byType(BackgroundPicker), findsOneWidget);
      },
    );

    testWidgets('a chosen Cell Shape is applied and remembered', (
      tester,
    ) async {
      final settings = await _openCustomizer(tester);

      await tester.tap(find.text(CellShape.hex.label));
      await tester.pumpAndSettle();

      expect(settings.writes['cellShape'], CellShape.hex);
    });

    testWidgets('a chosen Cell Size is applied and remembered', (tester) async {
      final settings = await _openCustomizer(tester);

      await tester.tap(find.text(CellSize.large.label));
      await tester.pumpAndSettle();

      expect(settings.writes['cellSize'], CellSize.large);
    });

    testWidgets('a chosen Palette is remembered by its key', (tester) async {
      final settings = await _openCustomizer(tester);

      await tester.tap(
        find
            .descendant(
              of: find.byType(PalettePicker),
              matching: find.byType(SettingSwatch),
            )
            .last,
      );
      await tester.pumpAndSettle();

      expect(settings.writes['paletteKey'], otherTestPalette.key);
    });

    testWidgets('a chosen Background is remembered by its name', (
      tester,
    ) async {
      final settings = await _openCustomizer(tester);
      final target = BackgroundPreset.values.last;

      await tester.tap(
        find
            .descendant(
              of: find.byType(BackgroundPicker),
              matching: find.byType(SettingSwatch),
            )
            .last,
      );
      await tester.pumpAndSettle();

      expect(settings.writes['backgroundPreset'], target.name);
    });

    testWidgets(
      'Apply closes the sheet, because every change is already live',
      (tester) async {
        await _openCustomizer(tester);

        await tester.ensureVisible(find.text('Apply'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Apply'));
        await tester.pumpAndSettle();

        expect(find.byType(CustomizerSheet), findsNothing);
      },
    );
  });
}
