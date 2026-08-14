import 'package:contribkit/domain/value_objects/contribution_level.dart';

final class ContributionDay {
  const ContributionDay({
    required this.date,
    required this.count,
    required this.level,
  });

  final DateTime date;

  final int? count;

  bool get isActive => level != ContributionLevel.none;

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
