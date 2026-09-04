import 'package:contribkit/domain/value_objects/app_settings.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/ui/features/customizer/customizer_sheet.dart';
import 'package:contribkit/ui/features/export/export_sheet.dart';
import 'package:contribkit/ui/features/tip/tip_jar_sheet.dart';
import 'package:contribkit/ui/features/viewer/viewer_screen.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';
import '../support/fixtures.dart';
import '../support/harness.dart';

const _scales = [1.0, 1.3, 2.0, 3.0];

const _screens = [Size(320, 640), Size(360, 800)];

List<Override> _loaded() => appOverrides(
  settings: FakeSettingsRepository(
    settings: AppSettings(
      lastUsername: Username('octocat'),
      lastYear: Year(2024),
    ),
  ),
  contributions: FakeContributionRepository(
    answer: testCalendar(weeks: 6, totalContributions: 1234),
  ),
);

Future<void> _atEveryScale(
  WidgetTester tester,
  Future<void> Function(WidgetTester tester) pump,
) async {
  for (final screen in _screens) {
    for (final scale in _scales) {
      tester.platformDispatcher.textScaleFactorTestValue = scale;
      await tester.binding.setSurfaceSize(screen);

      await pump(tester);

      expect(
        tester.takeException(),
        isNull,
        reason:
            'at ${scale}x text on a ${screen.width}x${screen.height} screen',
      );
    }
  }

  tester.platformDispatcher.clearTextScaleFactorTestValue();
  await tester.binding.setSurfaceSize(null);
}

void main() {
  group('nothing overflows when the system font grows', () {
    testWidgets('the Viewer, before a username and after one', (tester) async {
      await _atEveryScale(tester, (tester) async {
        await tester.pumpWidget(
          host(overrides: appOverrides(), child: const ViewerScreen()),
        );
        await tester.pumpAndSettle();
      });

      await _atEveryScale(tester, (tester) async {
        await tester.pumpWidget(
          host(overrides: _loaded(), child: const ViewerScreen()),
        );
        await tester.pumpAndSettle();
      });
    });

    testWidgets('the Customizer', (tester) async {
      await _atEveryScale(tester, (tester) async {
        await pumpSheet(
          tester,
          surfaceSize: tester.view.physicalSize / tester.view.devicePixelRatio,
          overrides: _loaded(),
          builder: (_) => const CustomizerSheet(),
        );
      });
    });

    testWidgets('the Export sheet', (tester) async {
      await _atEveryScale(tester, (tester) async {
        await pumpSheet(
          tester,
          surfaceSize: tester.view.physicalSize / tester.view.devicePixelRatio,
          overrides: appOverrides(),
          builder: (_) => ExportSheet(
            calendar: testCalendar(weeks: 3),
            palette: testPalette,
            cellShape: CellShape.rounded,
            cellSize: CellSize.normal,
          ),
        );
      });
    });

    testWidgets('the Tip Jar', (tester) async {
      await _atEveryScale(tester, (tester) async {
        await pumpSheet(
          tester,
          surfaceSize: tester.view.physicalSize / tester.view.devicePixelRatio,
          overrides: appOverrides(),
          builder: (_) => const TipJarSheet(),
        );
      });
    });
  });
}
