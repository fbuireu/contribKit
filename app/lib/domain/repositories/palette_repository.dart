import 'package:contribkit/domain/value_objects/palette.dart';

/// Provides the ordered list of available contribution palettes.
abstract interface class PaletteRepository {
  Future<List<Palette>> loadAll();
}
