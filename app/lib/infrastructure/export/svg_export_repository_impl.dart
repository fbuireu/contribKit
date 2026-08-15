import 'package:contribkit/domain/services/cell_geometry_service.dart';

import 'dart:convert';

import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/repositories/export_repository.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';

final class SvgExportRepository implements ExportRepository {
  @override
  Future<List<int>> export({
    required ContributionCalendar calendar,
    required RenderOptions options,
  }) async {
    try {
      final svg = _buildSvg(calendar, options);
      return utf8.encode(svg);
    } catch (e) {
      throw ExportFailure(message: 'SVG render failed: $e');
    }
  }

  String _buildSvg(ContributionCalendar calendar, RenderOptions options) {
    final cell = options.cellSize;
    final gap = options.gap;
    final step = cell + gap;

    final weeks = calendar.weeks;
    final width = weeks.length * step - gap;
    final height = 7 * step - gap;

    final buffer = StringBuffer()
      ..writeln('<?xml version="1.0" encoding="UTF-8"?>')
      ..writeln(
        '<svg xmlns="http://www.w3.org/2000/svg" '
        'width="${width.toStringAsFixed(1)}" '
        'height="${height.toStringAsFixed(1)}" '
        'viewBox="0 0 ${width.toStringAsFixed(1)} ${height.toStringAsFixed(1)}">',
      )
      ..writeln(
        '<title>${calendar.username} GitHub contributions ${calendar.year}</title>',
      );

    for (var wi = 0; wi < weeks.length; wi++) {
      final week = weeks[wi];
      for (var di = 0; di < week.days.length; di++) {
        final day = week.days[di];
        final x = wi * step;
        final y = di * step;
        final color = options.palette.colorFor(day.level, isDark: true);
        final fill = color.toHex();
        final title =
            '${day.date.toIso8601String().substring(0, 10)}: ${day.count ?? 'unknown'}';

        switch (options.shape) {
          case CellShape.square:
            buffer.writeln(
              '<rect x="${x.toStringAsFixed(1)}" y="${y.toStringAsFixed(1)}" '
              'width="${cell.toStringAsFixed(1)}" height="${cell.toStringAsFixed(1)}" '
              'fill="$fill"><title>$title</title></rect>',
            );
          case CellShape.rounded:
            final r = CellGeometryService.cornerRadiusFor(cell)
                .toStringAsFixed(1);
            buffer.writeln(
              '<rect x="${x.toStringAsFixed(1)}" y="${y.toStringAsFixed(1)}" '
              'width="${cell.toStringAsFixed(1)}" height="${cell.toStringAsFixed(1)}" '
              'rx="$r" ry="$r" fill="$fill"><title>$title</title></rect>',
            );
          case CellShape.circle:
            final cx = (x + cell / 2).toStringAsFixed(1);
            final cy = (y + cell / 2).toStringAsFixed(1);
            final r = (cell / 2).toStringAsFixed(1);
            buffer.writeln(
              '<circle cx="$cx" cy="$cy" r="$r" fill="$fill">'
              '<title>$title</title></circle>',
            );
          case CellShape.dot:
            final li = day.level.index;
            final r = CellGeometryService.dotRadiusFor(
              levelIndex: li,
              cellSize: cell,
            ).toStringAsFixed(2);
            final cx = (x + cell / 2).toStringAsFixed(1);
            final cy = (y + cell / 2).toStringAsFixed(1);
            buffer.writeln(
              '<circle cx="$cx" cy="$cy" r="$r" fill="$fill">'
              '<title>$title</title></circle>',
            );
          case CellShape.hex:
            final pts = _hexPoints(x + cell / 2, y + cell / 2, cell / 2);
            buffer.writeln(
              '<polygon points="$pts" fill="$fill">'
              '<title>$title</title></polygon>',
            );
        }
      }
    }

    buffer.writeln('</svg>');
    return buffer.toString();
  }
}

String _hexPoints(double cx, double cy, double r) {
  final vertices = CellGeometryService.hexVerticesFor(
    centerX: cx,
    centerY: cy,
    radius: r,
  );
  return vertices
      .map(
        (vertex) =>
            '${vertex.x.toStringAsFixed(2)},${vertex.y.toStringAsFixed(2)}',
      )
      .join(' ');
}
