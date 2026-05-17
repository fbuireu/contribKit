import 'package:flutter/widgets.dart';

/// Single source of truth for all design constants.
///
/// No magic numbers anywhere in the widget tree — every measurement,
/// duration, and radius comes from here.
abstract final class Tokens {
  // ---------------------------------------------------------------------------
  // Spacing — 4 px base scale
  // ---------------------------------------------------------------------------
  static const double space1 = 4;
  static const double space2 = 8;
  static const double space3 = 12;
  static const double space4 = 16;
  static const double space5 = 20;
  static const double space6 = 24;
  static const double space8 = 32;
  static const double space10 = 40;
  static const double space12 = 48;

  // ---------------------------------------------------------------------------
  // Radii
  // ---------------------------------------------------------------------------
  static const double radiusSm = 4;
  static const double radiusMd = 8;
  static const double radiusLg = 12;
  static const double radiusXl = 16;
  static const double radiusFull = 9999;

  // ---------------------------------------------------------------------------
  // Typography sizes
  // ---------------------------------------------------------------------------
  static const double textXs = 11;
  static const double textSm = 13;
  static const double textBase = 15;
  static const double textLg = 17;
  static const double textXl = 20;
  static const double text2Xl = 24;
  static const double text3Xl = 30;

  // ---------------------------------------------------------------------------
  // Animation durations
  // ---------------------------------------------------------------------------
  static const Duration durationFast = Duration(milliseconds: 120);
  static const Duration durationBase = Duration(milliseconds: 200);
  static const Duration durationSlow = Duration(milliseconds: 320);

  // ---------------------------------------------------------------------------
  // Calendar grid — cell dimensions
  // ---------------------------------------------------------------------------
  static const double cellSize = 11;
  static const double cellGap = 2;
  static const double cellStep = cellSize + cellGap;

  // ---------------------------------------------------------------------------
  // Palette swatch
  // ---------------------------------------------------------------------------
  static const double swatchSize = 14;
  static const double swatchBorderSelected = 2;
  static const double swatchBorderDefault = 1;

  // ---------------------------------------------------------------------------
  // Animation
  // ---------------------------------------------------------------------------
  static const double animScaleBegin = 0.6;

  // ---------------------------------------------------------------------------
  // Contribution grid
  // ---------------------------------------------------------------------------
  static const EdgeInsets gridPadding = EdgeInsets.all(space4);
}
