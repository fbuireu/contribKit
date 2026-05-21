import 'dart:convert';

import 'package:contribkit/domain/repositories/palette_repository.dart';
import 'package:contribkit/domain/value_objects/color.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:flutter/services.dart';

final class AssetPaletteRepository implements PaletteRepository {
  static const _assetKey = '../shared/palettes.json';

  @override
  Future<List<Palette>> loadAll() async {
    final raw = await rootBundle.loadString(_assetKey);
    final data = jsonDecode(raw) as List<dynamic>;
    return data.map(_fromJson).toList(growable: false);
  }

  static Palette _fromJson(dynamic json) {
    final m = json as Map<String, dynamic>;
    return Palette(
      name: m['name'] as String,
      none: Color(_hex(m['none'] as String)),
      noneLight: Color(_hex(m['noneLight'] as String)),
      low: Color(_hex(m['low'] as String)),
      medium: Color(_hex(m['medium'] as String)),
      high: Color(_hex(m['high'] as String)),
      veryHigh: Color(_hex(m['veryHigh'] as String)),
    );
  }

  // '#RRGGBB' → 0xFFRRGGBB (full-opacity ARGB)
  static int _hex(String hex) =>
      0xFF000000 | int.parse(hex.substring(1), radix: 16);
}
