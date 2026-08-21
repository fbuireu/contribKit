import 'dart:ui' as ui;

import 'package:contribkit/domain/services/cell_geometry_service.dart';
import 'package:contribkit/domain/services/export_geometry_service.dart';

import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/repositories/export_repository.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';

final class PngExportRepository implements ExportRepository {
  @override
  Future<List<int>> export({
    required ContributionCalendar calendar,
    required RenderOptions options,
  }) async {
    try {
      final cell = options.cellSize;
      final gap = options.gap;
      final step = cell + gap;
      final weeks = calendar.weeks;

      final pixels = ExportGeometryService.pngPixelSizeFor(
        cellSize: options.namedSize,
        weeks: weeks.length,
      );

      final recorder = ui.PictureRecorder();
      final canvas = ui.Canvas(recorder);
      canvas.scale(ExportGeometryService.pngPixelRatio);

      final paint = ui.Paint()..isAntiAlias = true;

      for (var wi = 0; wi < weeks.length; wi++) {
        final week = weeks[wi];
        for (var di = 0; di < week.days.length; di++) {
          final day = week.days[di];
          final x = wi * step;
          final y = di * step;
          final domainColor = options.palette.colorFor(day.level, isDark: true);
          paint.color = ui.Color(domainColor.argb);

          final rect = ui.Rect.fromLTWH(x, y, cell, cell);

          switch (options.shape) {
            case CellShape.square:
              canvas.drawRect(rect, paint);
            case CellShape.rounded:
              canvas.drawRRect(
                ui.RRect.fromRectXY(
                  rect,
                  CellGeometryService.cornerRadiusFor(cell),
                  CellGeometryService.cornerRadiusFor(cell),
                ),
                paint,
              );
            case CellShape.circle:
              canvas.drawCircle(rect.center, cell / 2, paint);
            case CellShape.dot:
              final li = day.level.index;
              final r = CellGeometryService.dotRadiusFor(
                levelIndex: li,
                cellSize: cell,
              );
              canvas.drawCircle(rect.center, r, paint);
            case CellShape.hex:
              final path = _hexPath(x + cell / 2, y + cell / 2, cell / 2);
              canvas.drawPath(path, paint);
          }
        }
      }

      final picture = recorder.endRecording();
      try {
        final image = await picture.toImage(pixels.width, pixels.height);
        try {
          final byteData = await image.toByteData(
            format: ui.ImageByteFormat.png,
          );

          if (byteData == null) {
            throw const ExportFailure(message: 'Failed to encode PNG');
          }

          return byteData.buffer.asUint8List().toList();
        } finally {
          image.dispose();
        }
      } finally {
        picture.dispose();
      }
    } on ExportFailure {
      rethrow;
    } catch (e) {
      throw ExportFailure(message: 'PNG render failed: $e');
    }
  }
}

ui.Path _hexPath(double cx, double cy, double r) {
  final path = ui.Path();
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
  return path..close();
}
