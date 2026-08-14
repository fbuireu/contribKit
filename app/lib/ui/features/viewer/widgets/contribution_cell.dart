import 'package:contribkit/domain/services/cell_geometry_service.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:contribkit/ui/widgets/app_tooltip.dart';
import 'package:contribkit/ui/theme/app_colors.dart';

import 'package:contribkit/domain/entities/contribution_day.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:flutter/widgets.dart';

class ContributionCell extends StatelessWidget {
  const ContributionCell({
    super.key,
    required this.day,
    required this.palette,
    required this.shape,
    required this.cellSize,
    this.animationDelay = Duration.zero,
  });

  final ContributionDay day;
  final Palette palette;
  final CellShape shape;
  final CellSize cellSize;
  final Duration animationDelay;

  @override
  Widget build(BuildContext context) {
    final isDark = AppColors.isDark(context);
    final domainColor = palette.colorFor(day.level, isDark: isDark);
    final color = Color(domainColor.argb);

    final count = day.count;
    final tooltip =
        '${day.date.toIso8601String().substring(0, 10)}: '
        '${count == null ? 'contributions unknown' : '$count contribution${count == 1 ? '' : 's'}'}';

    return AppTooltip(
      message: Text(tooltip, style: const TextStyle(fontSize: Tokens.textXs)),
      child:
          _CellShape(
                color: color,
                size: cellSize.pixels,
                shape: shape,
                levelIndex: day.level.index,
              )
              .animate(delay: animationDelay)
              .fadeIn(duration: Tokens.durationBase)
              .scale(
                begin: const Offset(
                  Tokens.animScaleBegin,
                  Tokens.animScaleBegin,
                ),
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
    required this.levelIndex,
  });

  final Color color;
  final double size;
  final CellShape shape;
  final int levelIndex;

  @override
  Widget build(BuildContext context) {
    return SizedBox.square(
      dimension: size,
      child: switch (shape) {
        CellShape.square => DecoratedBox(
          decoration: BoxDecoration(color: color),
        ),
        CellShape.rounded => DecoratedBox(
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(
              CellGeometryService.cornerRadiusFor(size),
            ),
          ),
        ),
        CellShape.circle => DecoratedBox(
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        CellShape.dot => CustomPaint(
          painter: _DotPainter(
            color: color,
            levelIndex: levelIndex,
            cellSize: size,
          ),
        ),
        CellShape.hex => CustomPaint(painter: _HexPainter(color: color)),
      },
    );
  }
}

class _DotPainter extends CustomPainter {
  const _DotPainter({
    required this.color,
    required this.levelIndex,
    required this.cellSize,
  });

  final Color color;
  final int levelIndex;
  final double cellSize;

  @override
  void paint(Canvas canvas, Size size) {
    final r = CellGeometryService.dotRadiusFor(
      levelIndex: levelIndex,
      cellSize: cellSize,
    );
    canvas.drawCircle(
      Offset(size.width / 2, size.height / 2),
      r,
      Paint()
        ..color = color
        ..isAntiAlias = true,
    );
  }

  @override
  bool shouldRepaint(_DotPainter old) =>
      old.color != color || old.levelIndex != levelIndex;
}

class _HexPainter extends CustomPainter {
  const _HexPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final r = size.width / 2;
    final path = Path();
    final vertices = CellGeometryService.hexVerticesFor(
      centerX: cx,
      centerY: cy,
      radius: r,
    );
    for (var i = 0; i < vertices.length; i++) {
      if (i == 0) {
        path.moveTo(vertices[i].x, vertices[i].y);
      } else {
        path.lineTo(vertices[i].x, vertices[i].y);
      }
    }
    path.close();
    canvas.drawPath(
      path,
      Paint()
        ..color = color
        ..isAntiAlias = true,
    );
  }

  @override
  bool shouldRepaint(_HexPainter old) => old.color != color;
}
