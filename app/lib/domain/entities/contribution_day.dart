import 'package:contribkit/domain/value_objects/contribution_level.dart';

/// A single day in the GitHub contribution calendar.
final class ContributionDay {
  const ContributionDay({
    required this.date,
    required this.count,
    required this.level,
  });

  final DateTime date;

  /// Number of contributions on this day.
  final int count;

  /// Bucketed intensity level derived from [count].
  final ContributionLevel level;

  @override
  bool operator ==(Object other) =>
      other is ContributionDay &&
      other.date == date &&
      other.count == count &&
      other.level == level;

  @override
  int get hashCode => Object.hash(date, count, level);
}
