import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/palette.dart';

final class RenderOptions {
  const RenderOptions({
    required this.palette,
    required this.shape,
    this.namedSize = CellSize.fallback,
  });

  final Palette palette;
  final CellShape shape;
  final CellSize namedSize;

  double get cellSize => namedSize.pixels;

  double get gap => namedSize.gap;
}

abstract interface class ExportRepository {
  Future<List<int>> export({
    required ContributionCalendar calendar,
    required RenderOptions options,
  });
}
