import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/presentation/features/viewer/widgets/contribution_cell.dart';
import 'package:contribkit/presentation/theme/tokens.dart';
import 'package:flutter/widgets.dart';

/// Renders the full 52-week contribution grid.
///
/// Wraps in a horizontal [SingleChildScrollView] so narrow screens can
/// scroll to see the full year.
class ContributionGrid extends StatelessWidget {
  const ContributionGrid({
    super.key,
    required this.calendar,
    required this.palette,
    required this.shape,
  });

  final ContributionCalendar calendar;
  final Palette palette;
  final CellShape shape;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: Tokens.gridPadding,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: Tokens.cellGap,
        children: [
          for (final (wi, week) in calendar.weeks.indexed)
            Column(
              mainAxisSize: MainAxisSize.min,
              spacing: Tokens.cellGap,
              children: [
                for (final day in week.days)
                  ContributionCell(
                    day: day,
                    palette: palette,
                    shape: shape,
                    animationDelay: Duration(milliseconds: wi * 8),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}
