import 'package:flutter/widgets.dart';
import 'package:google_fonts/google_fonts.dart';

/// Typography helpers for non-default font families.
///
/// Use [mono] for all numeric values, usernames, and code-adjacent labels —
/// matches the web's `.mono` utility class (JetBrains Mono + tabular nums).
abstract final class AppTextStyles {
  static TextStyle mono({
    double? fontSize,
    FontWeight? fontWeight,
    Color? color,
    double? letterSpacing,
    double? height,
  }) => GoogleFonts.jetBrainsMono(
    fontSize: fontSize,
    fontWeight: fontWeight,
    color: color,
    letterSpacing: letterSpacing,
    height: height,
    fontFeatures: const [
      FontFeature.enable('zero'),
      FontFeature.enable('ss01'),
    ],
  );
}
