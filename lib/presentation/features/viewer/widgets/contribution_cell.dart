import 'package:contribkit/domain/entities/contribution_day.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/presentation/theme/tokens.dart';
import 'package:flutter/widgets.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

/// Renders a single day cell in the contribution grid.
class ContributionCell extends StatelessWidget {
  const ContributionCell({
    super.key,
    required this.day,
    required this.palette,
    required this.shape,
    this.animationDelay = Duration.zero,
  });

  final ContributionDay day;
  final Palette palette;
  final CellShape shape;
  final Duration animationDelay;

  @override
  Widget build(BuildContext context) {
    final domainColor = palette.colorFor(day.level);
    final color = Color(domainColor.argb);

    final tooltip =
        '${day.date.toIso8601String().substring(0, 10)}: '
        '${day.count} contribution${day.count == 1 ? '' : 's'}';

    return ShadTooltip(
      builder: (_) =>
          Text(tooltip, style: const TextStyle(fontSize: Tokens.textXs)),
      child: _CellShape(color: color, size: Tokens.cellSize, shape: shape)
          .animate(delay: animationDelay)
          .fadeIn(duration: Tokens.durationBase)
          .scale(
            begin: const Offset(Tokens.animScaleBegin, Tokens.animScaleBegin),
            duration: Tokens.durationBase,
          ),
    );
  }
}

class _CellShape extends StatelessWidget {
  const _CellShape({
    required this.color,
    required this.size,
    required this.shape,
  });

  final Color color;
  final double size;
  final CellShape shape;

  @override
  Widget build(BuildContext context) {
    final decoration = switch (shape) {
      CellShape.square => BoxDecoration(color: color),
      CellShape.rounded => BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(Tokens.radiusSm * 0.5),
      ),
      CellShape.circle => BoxDecoration(color: color, shape: BoxShape.circle),
    };

    return SizedBox.square(
      dimension: size,
      child: DecoratedBox(decoration: decoration),
    );
  }
}
