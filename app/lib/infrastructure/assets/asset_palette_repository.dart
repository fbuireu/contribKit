import 'dart:convert';

import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/repositories/palette_repository.dart';
import 'package:contribkit/domain/value_objects/color.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:flutter/services.dart';

final class AssetPaletteRepository implements PaletteRepository {
  static const _assetKey = 'assets/palettes.json';

  @override
  Future<List<Palette>> loadAll() async {
    try {
      final raw = await rootBundle.loadString(_assetKey);
      final data = jsonDecode(raw) as List<dynamic>;
      return data.map(_fromJson).toList(growable: false);
    } catch (e) {
      throw const AssetFailure(asset: _assetKey);
    }
  }

  static Palette _fromJson(dynamic json) {
    final m = json as Map<String, dynamic>;
    return Palette(
      key: m['key'] as String,
      name: m['name'] as String,
      none: Color.fromHex(m['none'] as String),
      noneLight: Color.fromHex(m['noneLight'] as String),
      low: Color.fromHex(m['low'] as String),
      medium: Color.fromHex(m['medium'] as String),
      high: Color.fromHex(m['high'] as String),
      veryHigh: Color.fromHex(m['veryHigh'] as String),
    );
  }
}
