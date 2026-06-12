import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/ui/features/viewer/widgets/contribution_cell.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:flutter/widgets.dart';

class ContributionGrid extends StatelessWidget {
  const ContributionGrid({
    super.key,
    required this.calendar,
    required this.palette,
    required this.shape,
    required this.cellSize,
  });

  final ContributionCalendar calendar;
  final Palette palette;
  final CellShape shape;
  final CellSize cellSize;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: Tokens.gridPadding,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: cellSize.gap,
        children: [
          for (final (wi, week) in calendar.weeks.indexed)
            Column(
              mainAxisSize: MainAxisSize.min,
              spacing: cellSize.gap,
              children: [
                for (final day in week.days)
                  ContributionCell(
                    day: day,
                    palette: palette,
                    shape: shape,
                    cellSize: cellSize,
                    animationDelay: Duration(milliseconds: wi * 8),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}
