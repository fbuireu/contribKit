import 'package:contribkit/domain/services/cell_geometry_service.dart';

sealed class CellFigure {
  const CellFigure();
}

final class SquareFigure extends CellFigure {
  const SquareFigure();
}

final class RoundedFigure extends CellFigure {
  const RoundedFigure({required this.radius});

  final double radius;
}

final class CircleFigure extends CellFigure {
  const CircleFigure({required this.radius});

  final double radius;
}

final class PolygonFigure extends CellFigure {
  const PolygonFigure({required this.vertices});

  final List<HexVertex> vertices;
}
