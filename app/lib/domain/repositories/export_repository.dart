import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/palette.dart';

final class RenderOptions {
  const RenderOptions({
    required this.palette,
    required this.shape,
    this.cellSize = 11.0,
    this.gap = 2.0,
  });

  final Palette palette;
  final CellShape shape;
  final double cellSize;
  final double gap;
}

abstract interface class ExportRepository {
  Future<List<int>> export({
    required ContributionCalendar calendar,
    required RenderOptions options,
  });
}
