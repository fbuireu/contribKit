import 'package:contribkit/domain/entities/contribution_day.dart';

final class ContributionWeek {
  const ContributionWeek({required this.days});

  final List<ContributionDay> days;

  bool _listEquals({
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
