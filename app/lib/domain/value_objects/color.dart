/// A domain color stored as a 32-bit ARGB integer.
///
/// Intentionally avoids `dart:ui` so the domain layer stays pure Dart.
/// Infrastructure converts to `dart:ui.Color` at the rendering boundary.
final class Color {
  const Color(this.argb);

  /// ARGB value: 0xAARRGGBB.
  final int argb;

  int get alpha => (argb >> 24) & 0xFF;
  int get red => (argb >> 16) & 0xFF;
  int get green => (argb >> 8) & 0xFF;
  int get blue => argb & 0xFF;

  factory Color.fromARGB(int a, int r, int g, int b) => Color(
    ((a & 0xFF) << 24) | ((r & 0xFF) << 16) | ((g & 0xFF) << 8) | (b & 0xFF),
  );

  factory Color.fromRGB(int r, int g, int b) => Color.fromARGB(0xFF, r, g, b);

  /// Parses `#RRGGBB` or `#AARRGGBB` hex strings.
  factory Color.fromHex(String hex) {
    final cleaned = hex.startsWith('#') ? hex.substring(1) : hex;
    if (cleaned.length == 6) {
      return Color(int.parse('FF$cleaned', radix: 16));
    }
    if (cleaned.length == 8) {
      return Color(int.parse(cleaned, radix: 16));
    }
    throw ArgumentError('Invalid hex color: "$hex"');
  }

  /// Returns `#RRGGBB` (alpha stripped for CSS / SVG compatibility).
  String toHex() =>
      '#${argb.toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}';

  /// Full 8-digit hex with alpha prefix.
  String toHexARGB() =>
      '#${argb.toRadixString(16).padLeft(8, '0').toUpperCase()}';

  @override
  bool operator ==(Object other) => other is Color && other.argb == argb;

  @override
  int get hashCode => argb.hashCode;

  @override
  String toString() => toHex();
}
