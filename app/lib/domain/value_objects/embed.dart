import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/username.dart';

abstract final class Embed {
  static const origin = 'https://contribkit.app';
  static const segment = 'user';
  static const extension = '.svg';

  static const defaultPaletteKey = 'github';
  static const defaultShape = CellShape.rounded;

  static String urlFor({
    required Username username,
    String? paletteKey,
    CellShape? shape,
  }) {
    final query = <String>[
      if (paletteKey != null && paletteKey != defaultPaletteKey)
        'palette=${Uri.encodeComponent(paletteKey)}',
      if (shape != null && shape != defaultShape) 'shape=${shape.name}',
    ].join('&');

    final url =
        '$origin/$segment/${Uri.encodeComponent(username.value)}$extension';
    return query.isEmpty ? url : '$url?$query';
  }
}
