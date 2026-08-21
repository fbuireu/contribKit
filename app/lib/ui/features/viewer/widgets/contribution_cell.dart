import 'package:flutter/foundation.dart' show listEquals;

import 'package:contribkit/domain/services/cell_geometry_service.dart';
import 'package:contribkit/domain/value_objects/cell_figure.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:contribkit/ui/widgets/app_tooltip.dart';
import 'package:contribkit/ui/theme/app_colors.dart';

import 'package:contribkit/domain/entities/contribution_day.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/ui/features/viewer/widgets/contribution_format.dart';
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
        '${count == null ? unknownTotalPhrase : '$count contribution${count == 1 ? '' : 's'}'}';

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
      child: switch (CellGeometryService.figureFor(
        shape: shape,
        levelIndex: levelIndex,
        cellSize: size,
      )) {
        SquareFigure() => DecoratedBox(decoration: BoxDecoration(color: color)),
        RoundedFigure(:final radius) => DecoratedBox(
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(radius),
          ),
        ),
        CircleFigure(:final radius) => CustomPaint(
          painter: _CirclePainter(color: color, radius: radius),
        ),
        PolygonFigure(:final vertices) => CustomPaint(
          painter: _PolygonPainter(color: color, vertices: vertices),
        ),
      },
    );
  }
}

class _CirclePainter extends CustomPainter {
  const _CirclePainter({required this.color, required this.radius});

  final Color color;
  final double radius;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawCircle(
      Offset(size.width / 2, size.height / 2),
      radius,
      Paint()
        ..color = color
        ..isAntiAlias = true,
    );
  }

  @override
  bool shouldRepaint(_CirclePainter old) =>
      old.color != color || old.radius != radius;
}

class _PolygonPainter extends CustomPainter {
  const _PolygonPainter({required this.color, required this.vertices});

  final Color color;
  final List<HexVertex> vertices;

  @override
  void paint(Canvas canvas, Size size) {
    final path = Path();
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
  bool shouldRepaint(_PolygonPainter old) =>
      old.color != color || !listEquals(old.vertices, vertices);
}
