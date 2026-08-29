import 'package:contribkit/domain/entities/contribution_week.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';

final class ContributionCalendar {
  ContributionCalendar({
    required this.username,
    required this.year,
    required List<ContributionWeek> weeks,
    required this.totalContributions,
  }) : weeks = List.unmodifiable(weeks);

  final Username username;
  final Year year;

  final List<ContributionWeek> weeks;

  final int? totalContributions;

  bool _listEquals({
    required List<ContributionWeek> left,
    required List<ContributionWeek> right,
  }) {
    if (left.length != right.length) return false;
    for (var i = 0; i < left.length; i++) {
      if (left[i] != right[i]) return false;
    }
    return true;
  }

  @override
  bool operator ==(Object other) =>
      other is ContributionCalendar &&
      other.username == username &&
      other.year == year &&
      other.totalContributions == totalContributions &&
      _listEquals(left: other.weeks, right: weeks);

  @override
  int get hashCode =>
      Object.hash(username, year, totalContributions, Object.hashAll(weeks));
}
