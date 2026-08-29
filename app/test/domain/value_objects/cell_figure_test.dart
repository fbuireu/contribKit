import 'package:contribkit/domain/services/cell_geometry_service.dart';
import 'package:contribkit/domain/value_objects/cell_figure.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:flutter_test/flutter_test.dart';

CellFigure _figure(CellShape shape) =>
    CellGeometryService.figureFor(shape: shape, levelIndex: 2, cellSize: 10);

void main() {
  group('CellFigure is a value object, so it compares by value', () {
    test('what figureFor returns compares equal to an identical call', () {
      for (final shape in CellShape.values) {
        expect(_figure(shape), _figure(shape), reason: shape.name);
        expect(
          _figure(shape).hashCode,
          _figure(shape).hashCode,
          reason: shape.name,
        );
      }
    });

    test('different shapes do not collapse into one figure', () {
      expect(_figure(CellShape.circle), isNot(_figure(CellShape.square)));
      expect(_figure(CellShape.hex), isNot(_figure(CellShape.square)));
    });

    test('equal figures share a hashCode, so a Set holds one of them', () {
      for (final shape in CellShape.values) {
        expect(
          {_figure(shape), _figure(shape)},
          hasLength(1),
          reason: shape.name,
        );
      }
    });

    test('a polygon refuses to be mutated after it is built', () {
      final polygon = _figure(CellShape.hex) as PolygonFigure;

      expect(() => polygon.vertices.clear(), throwsUnsupportedError);
    });
  });
}
