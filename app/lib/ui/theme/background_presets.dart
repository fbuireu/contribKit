import 'package:flutter/widgets.dart';

enum BackgroundPreset { system, charcoal, github, navy, black }

abstract final class BackgroundPresets {
  static const labels = {
    BackgroundPreset.system: 'System',
    BackgroundPreset.charcoal: 'Charcoal',
    BackgroundPreset.github: 'GitHub',
    BackgroundPreset.navy: 'Navy',
    BackgroundPreset.black: 'Black',
  };

  static const Map<BackgroundPreset, Color?> colors = {
    BackgroundPreset.system: null,
    BackgroundPreset.charcoal: Color(0xFF1C1C1E),
    BackgroundPreset.github: Color(0xFF0D1117),
    BackgroundPreset.navy: Color(0xFF0A0E1A),
    BackgroundPreset.black: Color(0xFF000000),
  };

  static BackgroundPreset byName(String name) => BackgroundPreset.values
      .firstWhere((p) => p.name == name, orElse: () => BackgroundPreset.system);
}
