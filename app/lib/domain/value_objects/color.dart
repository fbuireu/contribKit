final class Color {
  const Color(this.argb)
    : assert(
        argb >= 0 && argb <= 0xFFFFFFFF,
        'A Color is an ARGB value; anything else makes toHex emit garbage',
      );

  factory Color.fromARGB({
    required int alpha,
    required int red,
    required int green,
    required int blue,
  }) => Color(
    ((alpha & 0xFF) << 24) |
        ((red & 0xFF) << 16) |
        ((green & 0xFF) << 8) |
        (blue & 0xFF),
  );

  factory Color.fromRGB({
    required int red,
    required int green,
    required int blue,
  }) => Color.fromARGB(alpha: 0xFF, red: red, green: green, blue: blue);

  factory Color.fromHex(String hex) {
    final cleaned = hex.startsWith('#') ? hex.substring(1) : hex;
    if (!_hexPattern.hasMatch(cleaned)) {
      throw ArgumentError('Invalid hex color: "$hex"');
    }
    return Color(
      int.parse(cleaned.length == 6 ? 'FF$cleaned' : cleaned, radix: 16),
    );
  }

  final int argb;

  int get alpha => (argb >> 24) & 0xFF;
  int get red => (argb >> 16) & 0xFF;
  int get green => (argb >> 8) & 0xFF;
  int get blue => argb & 0xFF;

  static final _hexPattern = RegExp(r'^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$');

  String toHex() =>
      '#${argb.toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}';

  String toHexARGB() =>
      '#${argb.toRadixString(16).padLeft(8, '0').toUpperCase()}';

  @override
  bool operator ==(Object other) => other is Color && other.argb == argb;

  @override
  int get hashCode => argb.hashCode;

  @override
  String toString() => toHex();
}
