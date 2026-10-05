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

        expect(size.width, 24.0);
      },
    );

    test('is seven Cells tall, whatever the Cell Size', () {
      const heights = {
        CellSize.compact: 75.0,
        CellSize.normal: 89.0,
        CellSize.large: 116.0,
      };

      expect(heights.keys, CellSize.values);
      for (final MapEntry(key: cellSize, value: height) in heights.entries) {
        final size = ExportGeometryService.logicalSizeFor(
          cellSize: cellSize,
          weeks: 53,
        );

        expect(size.height, height, reason: cellSize.name);
      }
    });

    test('grows with the week count, so a 54-week Year is wider', () {
      final short = ExportGeometryService.logicalSizeFor(
        cellSize: CellSize.normal,
        weeks: 53,
      );
      final long = ExportGeometryService.logicalSizeFor(
        cellSize: CellSize.normal,
        weeks: 54,
      );

      expect(short.width, 687.0);
      expect(long.width, 700.0);
      expect(long.height, short.height);
    });

    test('reports the exact pixel size the export tile advertises', () {
      expect(
        ExportGeometryService.pngPixelSizeFor(
          cellSize: CellSize.normal,
          weeks: 53,
        ),
        (width: 2061, height: 267),
        reason: 'the tile shows this, and it used to be an invented 2880x720',
      );
      expect(
        ExportGeometryService.pngPixelSizeFor(
          cellSize: CellSize.compact,
          weeks: 53,
        ),
        (width: 1743, height: 225),
      );
      expect(
        ExportGeometryService.pngPixelSizeFor(
          cellSize: CellSize.large,
          weeks: 53,
        ),
        (width: 2694, height: 348),
      );
    });
  });
}
