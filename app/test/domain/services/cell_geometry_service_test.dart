import 'dart:math' as math;

import 'package:contribkit/domain/services/cell_geometry_service.dart';
import 'package:contribkit/domain/value_objects/cell_figure.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('cornerRadiusFor', () {
    test('scales with the Cell Size rather than sitting at a fixed number', () {
      expect(
        CellGeometryService.cornerRadiusFor(14),
        greaterThan(CellGeometryService.cornerRadiusFor(9)),
      );
    });

    test('gives every named Cell Size a radius proportional to it', () {
      for (final size in CellSize.values) {
        expect(
          CellGeometryService.cornerRadiusFor(size.pixels),
          closeTo(size.pixels * 0.2, 1e-9),
          reason: size.name,
        );
      }
    });
  });

  group('dotRadiusFor', () {
    test('grows one unit per Contribution Level', () {
      const cell = CellGeometryService.dotReferenceCellSize;

      expect(
        CellGeometryService.dotRadiusFor(levelIndex: 0, cellSize: cell),
        closeTo(1.4, 1e-9),
      );
      expect(
        CellGeometryService.dotRadiusFor(levelIndex: 4, cellSize: cell),
        closeTo(5.4, 1e-9),
      );
    });

    test('scales with the Cell Size', () {
      expect(
        CellGeometryService.dotRadiusFor(levelIndex: 2, cellSize: 20),
        closeTo(
          CellGeometryService.dotRadiusFor(levelIndex: 2, cellSize: 10) * 2,
          1e-9,
        ),
      );
    });
  });

  group('hexVerticesFor', () {
    test('returns six vertices', () {
      expect(
        CellGeometryService.hexVerticesFor(centerX: 5, centerY: 5, radius: 5),
        hasLength(6),
      );
    });

    test('puts every vertex on the circle of the given radius', () {
      final vertices = CellGeometryService.hexVerticesFor(
        centerX: 7,
        centerY: 11,
        radius: 4,
      );

      for (final vertex in vertices) {
        final dx = vertex.x - 7;
        final dy = vertex.y - 11;
        expect(math.sqrt(dx * dx + dy * dy), closeTo(4, 1e-9));
      }
    });

    test('starts flat-topped, at 30 degrees, as every renderer expects', () {
      final first = CellGeometryService.hexVerticesFor(
        centerX: 0,
        centerY: 0,
        radius: 1,
      ).first;

      expect(first.x, closeTo(math.cos(math.pi / 6), 1e-9));
      expect(first.y, closeTo(math.sin(math.pi / 6), 1e-9));
    });
  });

  test('no Cell Size still lands on the fixed 2.0 the screen used to draw', () {
    const previousOnScreenRadius = 2.0;

    for (final size in CellSize.values) {
      expect(
        CellGeometryService.cornerRadiusFor(size.pixels),
        isNot(closeTo(previousOnScreenRadius, 1e-9)),
        reason:
            '${size.name} drew ${previousOnScreenRadius}px on screen and '
            '${size.pixels * 0.2}px in an Export',
      );
    }
  });

  group('figureFor', () {
    test('gives every Cell Shape exactly one primitive', () {
      final figures = {
        for (final shape in CellShape.values)
          shape: CellGeometryService.figureFor(
            shape: shape,
            levelIndex: 0,
            cellSize: 10,
          ),
      };

      expect(figures[CellShape.square], isA<SquareFigure>());
      expect(figures[CellShape.rounded], isA<RoundedFigure>());
      expect(figures[CellShape.circle], isA<CircleFigure>());
      expect(figures[CellShape.dot], isA<CircleFigure>());
      expect(figures[CellShape.hex], isA<PolygonFigure>());
    });

    test(
      'a circle fills the cell; a dot is level-sized and may overflow it',
      () {
        CircleFigure circleFor(CellShape shape, int level) =>
            CellGeometryService.figureFor(
              shape: shape,
              levelIndex: level,
              cellSize: 10,
            ) as CircleFigure;

        expect(circleFor(CellShape.circle, 4).radius, 5);
        expect(circleFor(CellShape.dot, 0).radius, lessThan(5));
        expect(
          circleFor(CellShape.dot, 4).radius,
          greaterThan(5),
          reason: 'the brightest dot overflows its own cell on purpose',
        );
      },
    );

    test('a dot grows with the Contribution Level, a circle does not', () {
      double dotRadius(int level) => (CellGeometryService.figureFor(
        shape: CellShape.dot,
        levelIndex: level,
        cellSize: 10,
      ) as CircleFigure).radius;

      expect(dotRadius(4), greaterThan(dotRadius(1)));
      expect(
        CellGeometryService.figureFor(
          shape: CellShape.circle,
          levelIndex: 0,
          cellSize: 10,
        ),
        isA<CircleFigure>().having((f) => f.radius, 'radius', 5),
      );
    });

    test('a rounded corner is the ratio, and the hex is cell-local', () {
      final rounded = CellGeometryService.figureFor(
        shape: CellShape.rounded,
        levelIndex: 0,
        cellSize: 10,
      ) as RoundedFigure;
      final hex = CellGeometryService.figureFor(
        shape: CellShape.hex,
        levelIndex: 0,
        cellSize: 10,
      ) as PolygonFigure;

      expect(rounded.radius, CellGeometryService.cornerRadiusFor(10));
      expect(hex.vertices, hasLength(CellGeometryService.hexVertexCount));
      for (final vertex in hex.vertices) {
        expect(vertex.x, inInclusiveRange(0, 10));
        expect(vertex.y, inInclusiveRange(0, 10));
      }
    });
  });
}
