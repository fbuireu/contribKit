import 'package:contribkit/domain/services/contribution_grid_service.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';

abstract final class ExportGeometryService {
  static const pngPixelRatio = 3.0;

  static ({double width, double height}) logicalSizeFor({
    required CellSize cellSize,
    required int weeks,
  }) {
    final step = cellSize.pixels + cellSize.gap;
    return (
      width: weeks * step - cellSize.gap,
      height: ContributionGridService.daysPerWeek * step - cellSize.gap,
    );
  }

  static ({int width, int height}) pngPixelSizeFor({
    required CellSize cellSize,
    required int weeks,
  }) {
    final logical = logicalSizeFor(cellSize: cellSize, weeks: weeks);
    return (
      width: (logical.width * pngPixelRatio).ceil(),
      height: (logical.height * pngPixelRatio).ceil(),
    );
  }
}
