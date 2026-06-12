import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/repositories/export_repository.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:flutter/widgets.dart';

final class PngExportRepository implements ExportRepository {
  static const _pixelRatio = 3.0;

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

      final logicalWidth = weeks.length * step - gap;
      final logicalHeight = 7 * step - gap;
      final pxW = (logicalWidth * _pixelRatio).ceil();
      final pxH = (logicalHeight * _pixelRatio).ceil();

      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      canvas.scale(_pixelRatio);

      final paint = Paint()..isAntiAlias = true;

      for (var wi = 0; wi < weeks.length; wi++) {
        final week = weeks[wi];
        for (var di = 0; di < week.days.length; di++) {
          final day = week.days[di];
          final x = wi * step;
          final y = di * step;
          final domainColor = options.palette.colorFor(day.level, isDark: true);
          paint.color = ui.Color(domainColor.argb);

          final rect = Rect.fromLTWH(x, y, cell, cell);

          switch (options.shape) {
            case CellShape.square:
              canvas.drawRect(rect, paint);
            case CellShape.rounded:
              canvas.drawRRect(
                RRect.fromRectXY(rect, cell * 0.2, cell * 0.2),
                paint,
              );
            case CellShape.circle:
              canvas.drawCircle(rect.center, cell / 2, paint);
            case CellShape.dot:
              final li = day.level.index;
              final r = (li == 0 ? 1.4 : 1.4 + li * 1.0) * (cell / 10.0);
              canvas.drawCircle(rect.center, r, paint);
            case CellShape.hex:
              final path = _hexPath(x + cell / 2, y + cell / 2, cell / 2);
              canvas.drawPath(path, paint);
          }
        }
      }

      final picture = recorder.endRecording();
      final image = await picture.toImage(pxW, pxH);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);

      if (byteData == null) {
        throw const ExportFailure(message: 'Failed to encode PNG');
      }

      return byteData.buffer.asUint8List().toList();
    } on ExportFailure {
      rethrow;
    } catch (e) {
      throw ExportFailure(message: 'PNG render failed: $e');
    }
  }
}

Path _hexPath(double cx, double cy, double r) {
  final path = Path();
  for (var i = 0; i < 6; i++) {
    final angle = (math.pi / 3) * i + math.pi / 6;
    final x = cx + r * math.cos(angle);
    final y = cy + r * math.sin(angle);
    if (i == 0) {
      path.moveTo(x, y);
    } else {
      path.lineTo(x, y);
    }
  }
  return path..close();
}
