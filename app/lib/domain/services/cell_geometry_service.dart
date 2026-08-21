import 'dart:math' as math;

import 'package:contribkit/domain/value_objects/cell_figure.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';

typedef HexVertex = ({double x, double y});

abstract final class CellGeometryService {
  static const cornerRadiusRatio = 0.2;

  static const dotBaseRadius = 1.4;

  static const dotReferenceCellSize = 10.0;

  static const hexVertexCount = 6;

  static CellFigure figureFor({
    required CellShape shape,
    required int levelIndex,
    required double cellSize,
  }) => switch (shape) {
    CellShape.square => const SquareFigure(),
    CellShape.rounded => RoundedFigure(radius: cornerRadiusFor(cellSize)),
    CellShape.circle => CircleFigure(radius: cellSize / 2),
    CellShape.dot => CircleFigure(
      radius: dotRadiusFor(levelIndex: levelIndex, cellSize: cellSize),
    ),
    CellShape.hex => PolygonFigure(
      vertices: hexVerticesFor(
        centerX: cellSize / 2,
        centerY: cellSize / 2,
        radius: cellSize / 2,
      ),
    ),
  };

  static double cornerRadiusFor(double cellSize) =>
      cellSize * cornerRadiusRatio;

  static double dotRadiusFor({
    required int levelIndex,
    required double cellSize,
  }) =>
      (levelIndex <= 0 ? dotBaseRadius : dotBaseRadius + levelIndex) *
      (cellSize / dotReferenceCellSize);

  static List<HexVertex> hexVerticesFor({
    required double centerX,
    required double centerY,
    required double radius,
  }) => [
    for (var vertex = 0; vertex < hexVertexCount; vertex++)
      (
        x: centerX + radius * math.cos((math.pi / 3) * vertex + math.pi / 6),
        y: centerY + radius * math.sin((math.pi / 3) * vertex + math.pi / 6),
      ),
  ];
}
