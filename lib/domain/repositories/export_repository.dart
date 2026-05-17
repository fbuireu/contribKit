import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/palette.dart';

/// Parameters for rendering a contribution calendar.
final class RenderOptions {
  const RenderOptions({
    required this.palette,
    required this.shape,
    this.cellSize = 11.0,
    this.gap = 2.0,
  });

  final Palette palette;
  final CellShape shape;

  /// Side length of each cell in logical pixels.
  final double cellSize;

  /// Gap between cells in logical pixels.
  final double gap;
}

/// Contract for exporting a [ContributionCalendar] to a specific format.
///
/// Implementations live in `infrastructure/export/`.
abstract interface class ExportRepository {
  /// Exports the [calendar] and returns the raw bytes (PNG, SVG, etc.).
  ///
  /// Throws [ExportFailure] on render errors.
  Future<List<int>> export({
    required ContributionCalendar calendar,
    required RenderOptions options,
  });
}
