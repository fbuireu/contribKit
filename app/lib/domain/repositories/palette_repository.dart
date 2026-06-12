import 'package:contribkit/domain/value_objects/palette.dart';

abstract interface class PaletteRepository {
  Future<List<Palette>> loadAll();
}
