import 'dart:convert';

import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/repositories/export_repository.dart';
import 'package:contribkit/domain/services/cell_geometry_service.dart';
import 'package:contribkit/domain/services/export_geometry_service.dart';
import 'package:contribkit/domain/value_objects/cell_figure.dart';

final class SvgExportRepository implements ExportRepository {
  @override
  Future<List<int>> export({
    required ContributionCalendar calendar,
    required RenderOptions options,
  }) async {
    try {
      final svg = _buildSvg(calendar: calendar, options: options);
      return utf8.encode(svg);
    } catch (e) {
      throw ExportFailure(message: 'SVG render failed: $e');
    }
  }

  String _buildSvg({
    required ContributionCalendar calendar,
    required RenderOptions options,
  }) {
    final cell = options.namedSize.pixels;
    final step = options.namedSize.step;

    final weeks = calendar.weeks;
    final size = ExportGeometryService.logicalSizeFor(
      cellSize: options.namedSize,
      weeks: weeks.length,
    );
    final width = size.width;
    final height = size.height;

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

        final figure = CellGeometryService.figureFor(
          shape: options.shape,
          levelIndex: day.level.index,
          cellSize: cell,
        );
        final box =
            'x="${x.toStringAsFixed(1)}" y="${y.toStringAsFixed(1)}" '
            'width="${cell.toStringAsFixed(1)}" height="${cell.toStringAsFixed(1)}"';
        final centre =
            'cx="${(x + cell / 2).toStringAsFixed(1)}" '
            'cy="${(y + cell / 2).toStringAsFixed(1)}"';

        switch (figure) {
          case SquareFigure():
            buffer.writeln(
              '<rect $box fill="$fill"><title>$title</title></rect>',
            );
          case RoundedFigure(:final radius):
            final r = radius.toStringAsFixed(1);
            buffer.writeln(
              '<rect $box rx="$r" ry="$r" fill="$fill">'
              '<title>$title</title></rect>',
            );
          case CircleFigure(:final radius):
            buffer.writeln(
              '<circle $centre r="${radius.toStringAsFixed(2)}" fill="$fill">'
              '<title>$title</title></circle>',
            );
          case PolygonFigure(:final vertices):
            final pts = vertices
                .map(
                  (v) =>
                      '${(v.x + x).toStringAsFixed(2)},'
                      '${(v.y + y).toStringAsFixed(2)}',
                )
                .join(' ');
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
