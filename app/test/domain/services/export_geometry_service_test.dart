import 'package:contribkit/domain/services/contribution_grid_service.dart';
import 'package:contribkit/domain/services/export_geometry_service.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('ExportGeometryService', () {
    test(
      'subtracts the trailing gap, so the edge is a Cell and not a space',
      () {
        final size = ExportGeometryService.logicalSizeFor(
          cellSize: CellSize.normal,
          weeks: 2,
        );

        expect(
          size.width,
          (CellSize.normal.pixels + CellSize.normal.gap) * 2 -
              CellSize.normal.gap,
        );
      },
    );

    test('is seven Cells tall, whatever the Cell Size', () {
      for (final cellSize in CellSize.values) {
        final size = ExportGeometryService.logicalSizeFor(cellSize: cellSize);
        final step = cellSize.pixels + cellSize.gap;

        expect(
          size.height,
          ContributionGridService.daysPerWeek * step - cellSize.gap,
          reason: cellSize.name,
        );
      }
    });

    test('defaults to the full 53-week grid', () {
      expect(
        ExportGeometryService.logicalSizeFor(cellSize: CellSize.normal).width,
        ExportGeometryService.logicalSizeFor(
          cellSize: CellSize.normal,
          weeks: ContributionGridService.weeksPerYear,
        ).width,
      );
    });

    test('reports the exact pixel size the export tile advertises', () {
      expect(ExportGeometryService.pngPixelSizeFor(cellSize: CellSize.normal), (
        width: 2061,
        height: 267,
      ), reason: 'the tile shows this, and it used to be an invented 2880x720');
      expect(
        ExportGeometryService.pngPixelSizeFor(cellSize: CellSize.compact),
        (width: 1743, height: 225),
      );
      expect(ExportGeometryService.pngPixelSizeFor(cellSize: CellSize.large), (
        width: 2694,
        height: 348,
      ));
    });

    test('a larger Cell Size makes a larger PNG, so the tile cannot lie', () {
      final compact = ExportGeometryService.pngPixelSizeFor(
        cellSize: CellSize.compact,
      );
      final large = ExportGeometryService.pngPixelSizeFor(
        cellSize: CellSize.large,
      );

      expect(large.width, greaterThan(compact.width));
      expect(large.height, greaterThan(compact.height));
    });
  });
}
