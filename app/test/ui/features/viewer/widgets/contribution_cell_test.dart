import 'package:contribkit/domain/entities/contribution_day.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/contribution_level.dart';
import 'package:contribkit/ui/features/viewer/widgets/contribution_cell.dart';
import 'package:contribkit/ui/features/viewer/widgets/contribution_format.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:contribkit/ui/widgets/app_tooltip.dart';
import 'package:flutter/material.dart' show ThemeMode;
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../../support/fixtures.dart';
import '../../../../support/harness.dart';

ContributionDay _day({
  int? count = 3,
  ContributionLevel level = ContributionLevel.low,
}) => ContributionDay(
  date: DateTime.utc(2024, 6, 15),
  count: count,
  level: level,
);

Future<void> _pumpCell(
  WidgetTester tester, {
  ContributionDay? day,
  CellShape shape = CellShape.rounded,
  CellSize cellSize = CellSize.normal,
  ThemeMode themeMode = ThemeMode.dark,
}) async {
  await pumpHosted(
    tester,
    themeMode: themeMode,
    child: ContributionCell(
      day: day ?? _day(),
      palette: testPalette,
      shape: shape,
      cellSize: cellSize,
    ),
  );
  await tester.pump(Tokens.durationBase);
}

String _tooltipOf(WidgetTester tester) =>
    (tester.widget<AppTooltip>(find.byType(AppTooltip)).message as Text).data!;

void main() {
  group('ContributionCell', () {
    testWidgets('is exactly the Cell Size it was given, on both axes', (
      tester,
    ) async {
      for (final size in CellSize.values) {
        await _pumpCell(tester, cellSize: size);

        final box = tester.widget<SizedBox>(
          find
              .descendant(
                of: find.byType(AppTooltip),
                matching: find.byType(SizedBox),
              )
              .first,
        );

        expect(box.width, size.pixels, reason: size.name);
        expect(box.height, size.pixels, reason: size.name);
      }
    });

    testWidgets('paints a box for the flat shapes and a path for the curved', (
      tester,
    ) async {
      const painted = {CellShape.circle, CellShape.dot, CellShape.hex};

      for (final shape in CellShape.values) {
        await _pumpCell(tester, shape: shape);

        expect(
          find.descendant(
            of: find.byType(AppTooltip),
            matching: find.byType(CustomPaint),
          ),
          painted.contains(shape) ? findsWidgets : findsNothing,
          reason: shape.name,
        );
      }
    });

    testWidgets('takes its colour from the Palette entry for the level', (
      tester,
    ) async {
      await _pumpCell(tester, day: _day(level: ContributionLevel.veryHigh));

      final decorated = tester.widget<DecoratedBox>(
        find
            .descendant(
              of: find.byType(AppTooltip),
              matching: find.byType(DecoratedBox),
            )
            .last,
      );

      expect(
        (decorated.decoration as BoxDecoration).color,
        const Color(0xFF200004),
      );
    });

    testWidgets('an empty day reads the light ramp under a light theme', (
      tester,
    ) async {
      await _pumpCell(
        tester,
        day: _day(count: 0, level: ContributionLevel.none),
        themeMode: ThemeMode.light,
      );

      final decorated = tester.widget<DecoratedBox>(
        find
            .descendant(
              of: find.byType(AppTooltip),
              matching: find.byType(DecoratedBox),
            )
            .last,
      );

      expect(
        (decorated.decoration as BoxDecoration).color,
        const Color(0xFF2FFFFF),
        reason: 'noneLight is the light-theme variant, and this is the app',
      );
    });

    testWidgets('says the date and the Count, and counts one in the singular', (
      tester,
    ) async {
      await _pumpCell(tester, day: _day(count: 1));
      expect(_tooltipOf(tester), '2024-06-15: 1 contribution');

      await _pumpCell(tester, day: _day(count: 2));
      expect(_tooltipOf(tester), '2024-06-15: 2 contributions');

      await _pumpCell(
        tester,
        day: _day(count: 0, level: ContributionLevel.none),
      );
      expect(_tooltipOf(tester), '2024-06-15: 0 contributions');
    });

    testWidgets('an unknown Count is said in words, never rendered as zero', (
      tester,
    ) async {
      await _pumpCell(tester, day: _day(count: null));

      expect(_tooltipOf(tester), '2024-06-15: $unknownTotalPhrase');
      expect(_tooltipOf(tester), isNot(contains('0 contribution')));
    });
  });
}
