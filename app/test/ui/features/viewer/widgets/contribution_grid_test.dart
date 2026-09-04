import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/ui/features/viewer/widgets/contribution_cell.dart';
import 'package:contribkit/ui/features/viewer/widgets/contribution_grid.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../../support/fixtures.dart';
import '../../../../support/harness.dart';

Future<void> _pumpGrid(
  WidgetTester tester, {
  int weeks = 4,
  CellSize cellSize = CellSize.normal,
  CellShape shape = CellShape.rounded,
}) async {
  await pumpHosted(
    tester,
    child: ContributionGrid(
      calendar: testCalendar(weeks: weeks),
      palette: testPalette,
      shape: shape,
      cellSize: cellSize,
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  group('ContributionGrid', () {
    testWidgets('draws one Cell per day, seven to a week', (tester) async {
      await _pumpGrid(tester, weeks: 3);

      expect(find.byType(ContributionCell), findsNWidgets(21));
    });

    testWidgets('scrolls sideways, because a year does not fit a phone', (
      tester,
    ) async {
      await _pumpGrid(tester, weeks: 53);

      final scroller = tester.widget<SingleChildScrollView>(
        find.byType(SingleChildScrollView),
      );

      expect(scroller.scrollDirection, Axis.horizontal);
    });

    testWidgets('spaces the Cells by the gap its Cell Size names', (
      tester,
    ) async {
      for (final size in CellSize.values) {
        await _pumpGrid(tester, cellSize: size);

        final row = tester.widget<Row>(find.byType(Row).first);
        final column = tester.widget<Column>(find.byType(Column).first);

        expect(row.spacing, size.gap, reason: size.name);
        expect(column.spacing, size.gap, reason: size.name);
      }
    });

    testWidgets('staggers a week behind the one before it', (tester) async {
      await _pumpGrid(tester, weeks: 3);

      final delays = tester
          .widgetList<ContributionCell>(find.byType(ContributionCell))
          .map((cell) => cell.animationDelay)
          .toList();

      expect(delays.first, Duration.zero);
      expect(delays[7], Tokens.cellStaggerStep);
      expect(delays[14], Tokens.cellStaggerStep * 2);
      expect(delays.take(7).toSet(), {
        Duration.zero,
      }, reason: 'a week arrives together, one column at a time');
    });

    testWidgets('hands every Cell the Palette and the shape it was given', (
      tester,
    ) async {
      await _pumpGrid(tester, weeks: 2, shape: CellShape.hex);

      for (final cell in tester.widgetList<ContributionCell>(
        find.byType(ContributionCell),
      )) {
        expect(cell.palette, testPalette);
        expect(cell.shape, CellShape.hex);
      }
    });

    testWidgets('renders nothing at all for a calendar with no weeks', (
      tester,
    ) async {
      await _pumpGrid(tester, weeks: 0);

      expect(find.byType(ContributionCell), findsNothing);
    });
  });
}
