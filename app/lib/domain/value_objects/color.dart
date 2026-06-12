final class Color {
  const Color(this.argb);

  final int argb;

  int get alpha => (argb >> 24) & 0xFF;
  int get red => (argb >> 16) & 0xFF;
  int get green => (argb >> 8) & 0xFF;
  int get blue => argb & 0xFF;

  factory Color.fromARGB(int a, int r, int g, int b) => Color(
    ((a & 0xFF) << 24) | ((r & 0xFF) << 16) | ((g & 0xFF) << 8) | (b & 0xFF),
  );

  factory Color.fromRGB(int r, int g, int b) => Color.fromARGB(0xFF, r, g, b);

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
