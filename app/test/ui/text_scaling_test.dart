import 'package:contribkit/domain/value_objects/app_settings.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/ui/features/contact/contact_sheet.dart';
import 'package:contribkit/ui/features/customizer/customizer_sheet.dart';
import 'package:contribkit/ui/features/export/export_sheet.dart';
import 'package:contribkit/ui/features/privacy/privacy_sheet.dart';
import 'package:contribkit/ui/features/tip/tip_jar_sheet.dart';
import 'package:contribkit/ui/features/viewer/viewer_screen.dart';
import 'package:contribkit/ui/features/viewer/widgets/contribution_grid.dart';
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
      lastYear: Year(2024, today: testToday),
    ),
  ),
  contributions: FakeContributionRepository(
    answer: testCalendar(weeks: 6, totalContributions: 1234),
  ),
);

Future<void> _atEveryScale(
  WidgetTester tester, {
  required Future<void> Function(Size screen) pump,
}) async {
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  addTearDown(() => tester.binding.setSurfaceSize(null));

  for (final screen in _screens) {
    for (final scale in _scales) {
      tester.platformDispatcher.textScaleFactorTestValue = scale;
      await tester.binding.setSurfaceSize(screen);

      await pump(screen);

      expect(
        tester.takeException(),
        isNull,
        reason:
            'at ${scale}x text on a ${screen.width}x${screen.height} screen',
      );
    }
  }
}

void main() {
  group('nothing overflows when the system font grows', () {
    testWidgets('the Viewer, before a username and after one', (tester) async {
      await _atEveryScale(
        tester,
        pump: (_) async {
          await tester.pumpWidget(
            host(overrides: appOverrides(), child: const ViewerScreen()),
          );
          await tester.pumpAndSettle();
        },
      );

      await _atEveryScale(
        tester,
        pump: (_) async {
          await tester.pumpWidget(const SizedBox.shrink());
          await tester.pumpWidget(
            host(overrides: _loaded(), child: const ViewerScreen()),
          );
          await tester.pumpAndSettle();

          expect(find.byType(ContributionGrid), findsOneWidget);
        },
      );
    });

    testWidgets('the Customizer', (tester) async {
      await _atEveryScale(
        tester,
        pump: (screen) => pumpSheet(
          tester,
          surfaceSize: screen,
          overrides: _loaded(),
          builder: (_) => const CustomizerSheet(),
        ),
      );
    });

    testWidgets('the Export sheet', (tester) async {
      await _atEveryScale(
        tester,
        pump: (screen) => pumpSheet(
          tester,
          surfaceSize: screen,
          overrides: appOverrides(),
          builder: (_) => ExportSheet(
            calendar: testCalendar(weeks: 3),
            palette: testPalette,
            cellShape: CellShape.rounded,
            cellSize: CellSize.normal,
          ),
        ),
      );
    });

    testWidgets('the Contact sheet', (tester) async {
      await _atEveryScale(
        tester,
        pump: (screen) => pumpSheet(
          tester,
          surfaceSize: screen,
          overrides: appOverrides(),
          builder: (_) => const ContactSheet(),
        ),
      );
    });

    testWidgets('the Tip Jar', (tester) async {
      await _atEveryScale(
        tester,
        pump: (screen) => pumpSheet(
          tester,
          surfaceSize: screen,
          overrides: appOverrides(),
          builder: (_) => const TipJarSheet(),
        ),
      );
    });

    testWidgets('the Privacy sheet', (tester) async {
      await _atEveryScale(
        tester,
        pump: (screen) => pumpSheet(
          tester,
          surfaceSize: screen,
          overrides: appOverrides(),
          builder: (_) => const PrivacySheet(),
        ),
      );
    });
  });
}
