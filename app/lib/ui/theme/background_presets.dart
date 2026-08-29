import 'package:contribkit/domain/value_objects/background_preset.dart';
import 'package:flutter/widgets.dart' as flutter;

export 'package:contribkit/domain/value_objects/background_preset.dart';

extension BackgroundPresetPainting on BackgroundPreset {
  flutter.Color? get flutterColor {
    final own = color;
    return own == null ? null : flutter.Color(own.argb);
  }

  flutter.Color colorOr(flutter.Color systemColor) =>
      flutterColor ?? systemColor;
}
