import 'dart:convert';

import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/services/export_geometry_service.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/export_format.dart';
import 'package:contribkit/ui/di/providers.dart';
import 'package:contribkit/ui/failure_message.dart';
import 'package:contribkit/ui/features/export/export_sheet.dart';
import 'package:contribkit/ui/features/viewer/widgets/contribution_grid.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:contribkit/ui/widgets/app_button.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';

import '../../../support/fakes.dart';
import '../../../support/fixtures.dart';
import '../../../support/harness.dart';

Future<void> _openSheet(
  WidgetTester tester, {
  required FakeExportDelivery delivery,
  FakeExportRepository? svg,
  FakeExportRepository? png,
  FakeExportRepository? markdown,
  CellSize cellSize = CellSize.normal,
  List<Override> extraOverrides = const [],
}) async {
  await pumpSheet(
    tester,
    overrides: [
      exportDeliveryProvider.overrideWithValue(delivery),
      svgExportRepositoryProvider.overrideWithValue(
        svg ?? FakeExportRepository(),
      ),
      pngExportRepositoryProvider.overrideWithValue(
        png ?? FakeExportRepository(),
      ),
      markdownExportRepositoryProvider.overrideWithValue(
        markdown ?? FakeExportRepository(bytes: utf8.encode('![](embed)')),
      ),
      ...extraOverrides,
    ],
    builder: (_) => ExportSheet(
      calendar: testCalendar(weeks: 3),
      palette: testPalette,
      cellShape: CellShape.rounded,
      cellSize: cellSize,
    ),
  );
}

Future<void> _tapAction(WidgetTester tester) async {
  final action = find.byType(AppButton);
  await tester.ensureVisible(action);
  await tester.pumpAndSettle();
  await tester.tap(action);
  await tester.pump();
  await tester.pump();
}

void main() {
  group('ExportSheet', () {
    testWidgets('offers every Export Format and starts on the fallback', (
      tester,
    ) async {
      await _openSheet(tester, delivery: FakeExportDelivery());

      expect(find.text('Export'), findsOneWidget);
      for (final format in ExportFormat.values) {
        expect(find.text(format.label), findsOneWidget, reason: format.name);
        expect(find.text('.${format.suffix}'), findsOneWidget);
      }
      expect(find.text('Share ${ExportFormat.fallback.label}'), findsOneWidget);
    });

    testWidgets('previews the calendar it was handed, filename and all', (
      tester,
    ) async {
      await _openSheet(tester, delivery: FakeExportDelivery());

      expect(find.byType(ContributionGrid), findsOneWidget);
      expect(find.text('octocat.png'), findsOneWidget);
    });

    testWidgets('names the pixel size a PNG would take at this Cell Size', (
      tester,
    ) async {
      await _openSheet(tester, delivery: FakeExportDelivery());

      final pixels = ExportGeometryService.pngPixelSizeFor(
        cellSize: CellSize.normal,
        weeks: 3,
      );

      expect(
        find.text('${pixels.width}×${pixels.height} · transparent'),
        findsOneWidget,
      );
    });

    testWidgets('switching to Markdown changes the action from share to copy', (
      tester,
    ) async {
      await _openSheet(tester, delivery: FakeExportDelivery());

      await tester.tap(find.text(ExportFormat.markdown.label));
      await tester.pumpAndSettle();

      expect(find.text('Copy MD'), findsOneWidget);
      expect(find.text('Share PNG'), findsNothing);
      expect(find.text('octocat.md'), findsOneWidget);
    });

    testWidgets(
      'shares the bytes the chosen renderer produced, named for the calendar',
      (tester) async {
        final delivery = FakeExportDelivery();
        final svg = FakeExportRepository(bytes: const [60, 115, 118, 103]);

        await _openSheet(tester, delivery: delivery, svg: svg);
        await tester.tap(find.text(ExportFormat.svg.label));
        await tester.pumpAndSettle();
        await _tapAction(tester);

        expect(svg.calls, 1);
        expect(delivery.shared, hasLength(1));
        expect(delivery.shared.single.bytes, [60, 115, 118, 103]);
        expect(delivery.shared.single.fileName, 'octocat_2024.svg');
        expect(delivery.shared.single.mimeType, 'image/svg+xml');
        expect(delivery.copied, isEmpty);
      },
    );

    testWidgets(
      'hands the renderer the Palette, shape and Cell Size on screen',
      (tester) async {
        final png = FakeExportRepository();

        await _openSheet(
          tester,
          delivery: FakeExportDelivery(),
          png: png,
          cellSize: CellSize.large,
        );
        await _tapAction(tester);

        expect(png.lastOptions?.palette, testPalette);
        expect(png.lastOptions?.shape, CellShape.rounded);
        expect(png.lastOptions?.namedSize, CellSize.large);
      },
    );

    testWidgets(
      'Markdown goes to the clipboard as text, not to a share sheet',
      (tester) async {
        final delivery = FakeExportDelivery();

        await _openSheet(tester, delivery: delivery);
        await tester.tap(find.text(ExportFormat.markdown.label));
        await tester.pumpAndSettle();
        await _tapAction(tester);

        expect(delivery.copied, ['![](embed)']);
        expect(delivery.shared, isEmpty);
      },
    );

    testWidgets('says Copied, and stops saying it once the moment passes', (
      tester,
    ) async {
      await _openSheet(tester, delivery: FakeExportDelivery());
      await tester.tap(find.text(ExportFormat.markdown.label));
      await tester.pumpAndSettle();
      await _tapAction(tester);

      expect(find.text('Copied!'), findsOneWidget);

      await tester.pump(Tokens.durationCopiedFeedback);
      await tester.pumpAndSettle();

      expect(find.text('Copied!'), findsNothing);
      expect(find.text('Copy MD'), findsOneWidget);
    });

    testWidgets('says why an Export failed, in the sheet, and stays open', (
      tester,
    ) async {
      const failure = ExportFailure(message: 'no canvas');

      await _openSheet(
        tester,
        delivery: FakeExportDelivery(),
        png: FakeExportRepository(failure: failure),
      );
      await _tapAction(tester);
      await tester.pumpAndSettle();

      expect(find.text(FailureMessage.of(failure)), findsOneWidget);
      expect(find.byType(ExportSheet), findsOneWidget);
    });

    testWidgets(
      'a failure to deliver is reported the same way a render failure is',
      (tester) async {
        const failure = ExportFailure(message: 'share sheet refused');

        await _openSheet(
          tester,
          delivery: FakeExportDelivery(failure: failure),
        );
        await _tapAction(tester);
        await tester.pumpAndSettle();

        expect(find.text(FailureMessage.of(failure)), findsOneWidget);
      },
    );

    testWidgets('clears the last error when a new Export starts', (
      tester,
    ) async {
      const failure = ExportFailure(message: 'no canvas');
      final png = FakeExportRepository(failure: failure);

      await _openSheet(tester, delivery: FakeExportDelivery(), png: png);
      await _tapAction(tester);
      await tester.pumpAndSettle();
      expect(find.text(FailureMessage.of(failure)), findsOneWidget);

      await tester.tap(find.text(ExportFormat.svg.label));
      await tester.pumpAndSettle();
      await _tapAction(tester);
      await tester.pumpAndSettle();

      expect(find.text(FailureMessage.of(failure)), findsNothing);
    });
  });
}
