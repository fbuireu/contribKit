import 'package:flutter/widgets.dart';

enum BackgroundPreset {
  system,
  charcoal,
  github,
  navy,
  black;

  static const BackgroundPreset fallback = BackgroundPreset.system;

  String get label => switch (this) {
    BackgroundPreset.system => 'System',
    BackgroundPreset.charcoal => 'Charcoal',
    BackgroundPreset.github => 'GitHub',
    BackgroundPreset.navy => 'Navy',
    BackgroundPreset.black => 'Black',
  };

  Color? get color => switch (this) {
    BackgroundPreset.system => null,
    BackgroundPreset.charcoal => const Color(0xFF1C1C1E),
    BackgroundPreset.github => const Color(0xFF0D1117),
    BackgroundPreset.navy => const Color(0xFF0A0E1A),
    BackgroundPreset.black => const Color(0xFF000000),
  };

  Color colorOr(Color systemColor) => color ?? systemColor;

  static BackgroundPreset? byName(String name) =>
      BackgroundPreset.values.where((p) => p.name == name).firstOrNull;
}
