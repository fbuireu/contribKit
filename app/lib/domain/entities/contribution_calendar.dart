import 'package:contribkit/domain/entities/contribution_week.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';

final class ContributionCalendar {
  const ContributionCalendar({
    required this.username,
    required this.year,
    required this.weeks,
    required this.totalContributions,
  });

  final Username username;
  final Year year;

  final List<ContributionWeek> weeks;

  final int totalContributions;

  bool _listEquals(List<ContributionWeek> a, List<ContributionWeek> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  bool operator ==(Object other) =>
      other is ContributionCalendar &&
      other.username == username &&
      other.year == year &&
      other.totalContributions == totalContributions &&
      _listEquals(other.weeks, weeks);

  @override
  int get hashCode =>
      Object.hash(username, year, totalContributions, Object.hashAll(weeks));
}
