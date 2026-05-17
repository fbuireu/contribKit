import 'package:contribkit/domain/entities/contribution_day.dart';

/// A column of up to 7 contribution days in the calendar grid.
final class ContributionWeek {
  const ContributionWeek({required this.days});

  /// Days in this week, ordered Sunday → Saturday.
  final List<ContributionDay> days;

  bool _listEquals(List<ContributionDay> a, List<ContributionDay> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  bool operator ==(Object other) =>
      other is ContributionWeek && _listEquals(other.days, days);

  @override
  int get hashCode => Object.hashAll(days);
}
