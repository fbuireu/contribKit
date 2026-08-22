import 'dart:ui' as ui;

import 'package:contribkit/domain/services/cell_geometry_service.dart';
import 'package:contribkit/domain/value_objects/cell_figure.dart';
import 'package:contribkit/domain/services/export_geometry_service.dart';

import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/repositories/export_repository.dart';

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

          final figure = CellGeometryService.figureFor(
            shape: options.shape,
            levelIndex: day.level.index,
            cellSize: cell,
          );

          switch (figure) {
            case SquareFigure():
              canvas.drawRect(rect, paint);
            case RoundedFigure(:final radius):
              canvas.drawRRect(
                ui.RRect.fromRectXY(rect, radius, radius),
                paint,
              );
            case CircleFigure(:final radius):
              canvas.drawCircle(rect.center, radius, paint);
            case PolygonFigure(:final vertices):
              canvas.drawPath(_pathThrough(vertices, dx: x, dy: y), paint);
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

ui.Path _pathThrough(
  List<HexVertex> vertices, {
  required double dx,
  required double dy,
}) {
  final path = ui.Path();
  for (var i = 0; i < vertices.length; i++) {
    final x = vertices[i].x + dx;
    final y = vertices[i].y + dy;
    if (i == 0) {
      path.moveTo(x, y);
    } else {
      path.lineTo(x, y);
    }
  }
  return path..close();
}
