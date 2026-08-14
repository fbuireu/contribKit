import 'package:contribkit/domain/value_objects/palette.dart';

abstract final class PaletteService {
  static Palette? resolve({
    required List<Palette> palettes,
    required String? storedKey,
  }) {
    if (palettes.isEmpty) return null;
    if (storedKey == null) return palettes.first;

    return palettes.firstWhere(
      (palette) => palette.key == storedKey || palette.name == storedKey,
      orElse: () => palettes.first,
    );
  }
}
