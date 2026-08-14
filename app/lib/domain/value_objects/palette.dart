import 'package:contribkit/domain/value_objects/color.dart';
import 'package:contribkit/domain/value_objects/contribution_level.dart';

final class Palette {
  const Palette({
    required this.key,
    required this.name,
    required this.none,
    required this.noneLight,
    required this.low,
    required this.medium,
    required this.high,
    required this.veryHigh,
  });

  final String key;

  final String name;

  final Color none;

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
      other.key == key &&
      other.name == name &&
      other.none == none &&
      other.noneLight == noneLight &&
      other.low == low &&
      other.medium == medium &&
      other.high == high &&
      other.veryHigh == veryHigh;

  @override
  int get hashCode =>
      Object.hash(key, name, none, noneLight, low, medium, high, veryHigh);

  @override
  String toString() => 'Palette($key)';
}
