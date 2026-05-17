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
    required this.low,
    required this.medium,
    required this.high,
    required this.veryHigh,
  });

  final String name;
  final Color none;
  final Color low;
  final Color medium;
  final Color high;
  final Color veryHigh;

  /// Returns the color for a given contribution level.
  Color colorFor(ContributionLevel level) => switch (level) {
    ContributionLevel.none => none,
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
      other.low == low &&
      other.medium == medium &&
      other.high == high &&
      other.veryHigh == veryHigh;

  @override
  int get hashCode => Object.hash(name, none, low, medium, high, veryHigh);

  @override
  String toString() => 'Palette($name)';
}
