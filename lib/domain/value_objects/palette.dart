import 'package:contribkit/domain/value_objects/color.dart';
import 'package:contribkit/domain/value_objects/contribution_level.dart';

/// An immutable five-level color palette for contribution visualization.
///
/// Each level maps to one of the [ContributionLevel] values. The palette is
/// the user's primary customization surface — predefined palettes live in
/// [Palettes].
final class Palette {
  const Palette({
    required this.name,
    required this.none,
    required this.noneLight,
    required this.low,
    required this.medium,
    required this.high,
    required this.veryHigh,
  });

  final String name;

  /// Empty-cell color for dark mode.
  final Color none;

  /// Empty-cell color for light mode.
  final Color noneLight;
  final Color low;
  final Color medium;
  final Color high;
  final Color veryHigh;

  Color colorFor(ContributionLevel level, {bool isDark = true}) =>
      switch (level) {
        ContributionLevel.none => isDark ? none : noneLight,
        ContributionLevel.low => low,
        ContributionLevel.medium => medium,
        ContributionLevel.high => high,
        ContributionLevel.veryHigh => veryHigh,
      };

  @override
  bool operator ==(Object other) =>
      other is Palette &&
      other.name == name &&
      other.none == none &&
      other.noneLight == noneLight &&
      other.low == low &&
      other.medium == medium &&
      other.high == high &&
      other.veryHigh == veryHigh;

  @override
  int get hashCode =>
      Object.hash(name, none, noneLight, low, medium, high, veryHigh);

  @override
  String toString() => 'Palette($name)';
}
