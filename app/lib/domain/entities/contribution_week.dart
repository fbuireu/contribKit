import 'package:contribkit/domain/entities/contribution_day.dart';

final class ContributionWeek {
  ContributionWeek({required List<ContributionDay> days})
    : days = List.unmodifiable(days);

  final List<ContributionDay> days;

  static bool _listEquals({
    required List<ContributionDay> left,
    required List<ContributionDay> right,
  }) {
    if (left.length != right.length) return false;
    for (var i = 0; i < left.length; i++) {
      if (left[i] != right[i]) return false;
    }
    return true;
  }

  @override
  bool operator ==(Object other) =>
      other is ContributionWeek && _listEquals(left: other.days, right: days);

  @override
  int get hashCode => Object.hashAll(days);
}
