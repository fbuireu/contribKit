import 'package:flutter/widgets.dart';

abstract final class Tokens {
  static const double space1 = 4;
  static const double space2 = 8;
  static const double space3 = 12;
  static const double space4 = 16;
  static const double space5 = 20;
  static const double space6 = 24;
  static const double space8 = 32;
  static const double space10 = 40;
  static const double space12 = 48;

  static const double radiusSm = 4;
  static const double radiusMd = 8;
  static const double radiusLg = 12;
  static const double radiusXl = 16;
  static const double radiusFull = 9999;

  static const double textXs = 11;
  static const double textSm = 13;
  static const double textBase = 15;
  static const double textLg = 17;
  static const double textXl = 20;
  static const double text2Xl = 24;
  static const double text3Xl = 30;

  static const Duration durationFast = Duration(milliseconds: 120);
  static const Duration durationBase = Duration(milliseconds: 200);
  static const Duration durationSlow = Duration(milliseconds: 320);
  static const Duration durationEntrance = Duration(milliseconds: 500);
  static const Duration durationBreathe = Duration(milliseconds: 800);
  static const Duration durationSpin = Duration(milliseconds: 900);
  static const Duration durationCopiedFeedback = Duration(milliseconds: 1500);
  static const Duration cellStaggerStep = Duration(milliseconds: 8);
  static const List<Duration> pulseDotDelays = [
    Duration.zero,
    Duration(milliseconds: 160),
    Duration(milliseconds: 320),
  ];

  static const double swatchGap = 2;

  static const double iconXs = 14;
  static const double iconSm = 16;
  static const double iconMd = 18;
  static const double iconLg = 20;

  static const double dragHandleWidth = 36;
  static const double dragHandleHeight = 4;
  static const double formatTileSize = 44;
  static const double tipTileHeight = 68;
  static const double logoSize = 22;
  static const double emojiSize = 22;
  static const double hairlineGap = 2;

  static const double swatchSize = 14;
  static const double swatchBorderSelected = 2;
  static const double swatchBorderDefault = 1;
  static const double swatchRampRadius = 2;

  static const double animScaleBegin = 0.6;

  static const EdgeInsets gridPadding = EdgeInsets.all(space4);
  static const EdgeInsets badgePadding = EdgeInsets.symmetric(
    horizontal: 10,
    vertical: 3,
  );
  static const EdgeInsets filenamePadding = EdgeInsets.symmetric(
    horizontal: space2,
    vertical: 3,
  );
  static const EdgeInsets pillPadding = EdgeInsets.symmetric(
    horizontal: space2,
    vertical: 2,
  );
}
