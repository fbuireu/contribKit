import 'package:contribkit/domain/services/cell_geometry_service.dart';

sealed class CellFigure {
  const CellFigure();
}

final class SquareFigure extends CellFigure {
  const SquareFigure();

  @override
  bool operator ==(Object other) => other is SquareFigure;

  @override
  int get hashCode => (SquareFigure).hashCode;
}

final class RoundedFigure extends CellFigure {
  const RoundedFigure({required this.radius});

  final double radius;

  @override
  bool operator ==(Object other) =>
      other is RoundedFigure && other.radius == radius;

  @override
  int get hashCode => Object.hash(RoundedFigure, radius);
}

final class CircleFigure extends CellFigure {
  const CircleFigure({required this.radius});

  final double radius;

  @override
  bool operator ==(Object other) =>
      other is CircleFigure && other.radius == radius;

  @override
  int get hashCode => Object.hash(CircleFigure, radius);
}

final class PolygonFigure extends CellFigure {
  PolygonFigure({required List<HexVertex> vertices})
    : vertices = List.unmodifiable(vertices);

  final List<HexVertex> vertices;

  @override
  bool operator ==(Object other) =>
      other is PolygonFigure && _sameVertices(other.vertices);

  bool _sameVertices(List<HexVertex> other) {
    if (other.length != vertices.length) return false;
    for (var i = 0; i < vertices.length; i++) {
      if (other[i] != vertices[i]) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hash(PolygonFigure, Object.hashAll(vertices));
}
