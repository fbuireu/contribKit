import 'dart:ui' show Tristate;

import 'package:contribkit/domain/value_objects/app_settings.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/export_format.dart';
import 'package:contribkit/domain/value_objects/tip_product.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/ui/features/customizer/customizer_sheet.dart';
import 'package:contribkit/ui/features/export/export_sheet.dart';
import 'package:contribkit/ui/features/tip/tip_jar_sheet.dart';
import 'package:contribkit/ui/features/viewer/viewer_screen.dart';
import 'package:contribkit/ui/theme/background_presets.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';
import '../support/fixtures.dart';
import '../support/harness.dart';

const _tipProducts = [
  TipProduct(id: 'tip.coffee', title: 'Coffee', priceString: r'$1.00'),
];

const _tall = Size(800, 2400);

SemanticsNode _semanticsRoot(WidgetTester tester) {
  SemanticsNode? root;
  void visitOwner(PipelineOwner owner) {
    root ??= owner.semanticsOwner?.rootSemanticsNode;
    owner.visitChildren(visitOwner);
  }

  visitOwner(tester.binding.rootPipelineOwner);
  return root!;
}

List<SemanticsNode> _buttons(WidgetTester tester) {
  final found = <SemanticsNode>[];
  void visit(SemanticsNode node) {
    if (node.flagsCollection.isButton) found.add(node);
    node.visitChildren((child) {
      visit(child);
      return true;
    });
  }

  visit(_semanticsRoot(tester));
  return found;
}

Set<String> _buttonLabels(WidgetTester tester) =>
    _buttons(tester).map((node) => node.label).toSet();

void _expectEveryButtonAnnounced(WidgetTester tester) {
  expect(
    _buttonLabels(tester),
    isNot(contains('')),
    reason: 'an unlabelled button is a box a screen reader cannot announce',
  );
}

Future<void> _expectMeetsGuidelines(WidgetTester tester) async {
  await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
  await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
  await expectLater(tester, meetsGuideline(textContrastGuideline));
}

Future<void> _withSemantics(
  WidgetTester tester,
  Future<void> Function() body,
) async {
  final handle = tester.ensureSemantics();
  try {
    await body();
  } finally {
    handle.dispose();
  }
}

Future<void> _pumpViewer(
  WidgetTester tester, {
  FakeSuggestedUsernameRepository? usernames,
}) async {
  await tester.binding.setSurfaceSize(_tall);
  addTearDown(() => tester.binding.setSurfaceSize(null));

  await tester.pumpWidget(
    host(
      overrides: appOverrides(usernames: usernames),
      child: const ViewerScreen(),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  group('every tap target says what it is', () {
    testWidgets('the Viewer names its year pills, suggestions and icons', (
      tester,
    ) async {
      await _withSemantics(tester, () async {
        await _pumpViewer(
          tester,
          usernames: FakeSuggestedUsernameRepository(names: const ['torvalds']),
        );

        final labels = _buttonLabels(tester);

        expect(labels, contains('torvalds'));
        expect(labels, contains('Year ${DateTime.now().year}'));
        expect(labels, contains('Year ${Year.minYear}'));
        expect(labels, contains('Support ContribKit'));
        expect(labels, contains('Switch to the light theme'));
        expect(labels, contains('Show contributions'));
        _expectEveryButtonAnnounced(tester);
        await _expectMeetsGuidelines(tester);
        await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
      });
    });

    testWidgets('the Customizer names every swatch by the thing it picks', (
      tester,
    ) async {
      await _withSemantics(tester, () async {
        await pumpSheet(
          tester,
          overrides: appOverrides(
            settings: FakeSettingsRepository(
              settings: AppSettings(
                lastUsername: Username('octocat'),
                lastYear: Year(2024),
              ),
            ),
            palettes: FakePaletteRepository(
              palettes: const [testPalette, otherTestPalette],
            ),
            contributions: FakeContributionRepository(
              answer: testCalendar(weeks: 3),
            ),
          ),
          builder: (_) => const CustomizerSheet(),
        );

        final labels = _buttonLabels(tester);

        expect(labels, containsAll([testPalette.name, otherTestPalette.name]));
        expect(
          labels,
          containsAll(BackgroundPreset.values.map((preset) => preset.label)),
        );
        expect(
          labels,
          containsAll(CellShape.values.map((shape) => shape.label)),
        );
        expect(labels, containsAll(CellSize.values.map((size) => size.label)));
        expect(labels, containsAll(['Apply', 'Close']));
        _expectEveryButtonAnnounced(tester);
        await _expectMeetsGuidelines(tester);
      });
    });

    testWidgets('the Export sheet names each format and the size it makes', (
      tester,
    ) async {
      await _withSemantics(tester, () async {
        await pumpSheet(
          tester,
          overrides: appOverrides(),
          builder: (_) => ExportSheet(
            calendar: testCalendar(weeks: 3),
            palette: testPalette,
            cellShape: CellShape.rounded,
            cellSize: CellSize.normal,
          ),
        );

        final labels = _buttonLabels(tester);

        for (final format in ExportFormat.values) {
          expect(
            labels.any((label) => label.startsWith('${format.label} export')),
            isTrue,
            reason: '${format.name} has no announced label',
          );
        }
        _expectEveryButtonAnnounced(tester);
        await _expectMeetsGuidelines(tester);
      });
    });

    testWidgets('the Tip Jar names each tier with its price', (tester) async {
      await _withSemantics(tester, () async {
        await pumpSheet(
          tester,
          overrides: appOverrides(
            tips: FakeTipRepository(products: _tipProducts),
          ),
          builder: (_) => const TipJarSheet(),
        );

        expect(_buttonLabels(tester), contains(r'Coffee, $1.00'));
        _expectEveryButtonAnnounced(tester);
        await _expectMeetsGuidelines(tester);
      });
    });
  });

  group('a tap target announces the state it is in', () {
    testWidgets('the selected year is the only one marked selected', (
      tester,
    ) async {
      await _withSemantics(tester, () async {
        await _pumpViewer(tester);

        final selected = _buttons(tester)
            .where((node) => node.flagsCollection.isSelected == Tristate.isTrue)
            .map((node) => node.label)
            .toList();

        expect(selected, ['Year ${DateTime.now().year}']);
      });
    });

    testWidgets('a suggestion carries an enabled state, so a reader can tell', (
      tester,
    ) async {
      await _withSemantics(tester, () async {
        await _pumpViewer(
          tester,
          usernames: FakeSuggestedUsernameRepository(names: const ['torvalds']),
        );

        final suggestion = _buttons(tester)
            .firstWhere((node) => node.label == 'torvalds');

        expect(suggestion.flagsCollection.isEnabled, Tristate.isTrue);
      });
    });

    testWidgets('the theme toggle names the theme it would move to', (
      tester,
    ) async {
      await _withSemantics(tester, () async {
        await _pumpViewer(tester);

        expect(_buttonLabels(tester), contains('Switch to the light theme'));

        await tester.tap(find.bySemanticsLabel('Switch to the light theme'));
        await tester.pumpAndSettle();

        expect(_buttonLabels(tester), contains('Switch to the dark theme'));
      });
    });
  });
}
