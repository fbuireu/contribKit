import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/entities/contribution_day.dart';
import 'package:contribkit/domain/entities/contribution_week.dart';
import 'package:contribkit/domain/services/contribution_grid_service.dart';
import 'package:contribkit/domain/value_objects/color.dart';
import 'package:contribkit/domain/value_objects/contribution_level.dart';
import 'package:contribkit/domain/value_objects/contribution_stats.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/domain/value_objects/tip_product.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';

const testPalette = Palette(
  key: 'nord',
  name: 'Nord',
  none: Color(0xFF200000),
  noneLight: Color(0xFF2FFFFF),
  low: Color(0xFF200001),
  medium: Color(0xFF200002),
  high: Color(0xFF200003),
  veryHigh: Color(0xFF200004),
);

const otherTestPalette = Palette(
  key: 'ember',
  name: 'Ember',
  none: Color(0xFF300000),
  noneLight: Color(0xFF3FFFFF),
  low: Color(0xFF300001),
  medium: Color(0xFF300002),
  high: Color(0xFF300003),
  veryHigh: Color(0xFF300004),
);

final testStats = ContributionStats(
  currentStreak: 4,
  longestStreak: 12,
  bestDayCount: 9,
  bestDayDate: DateTime.utc(2024, 5, 12),
  totalDaysActive: 40,
  weeklyAverage: 7.5,
  bestMonthContributions: 60,
  bestMonth: 3,
);

const testTipProducts = [
  TipProduct(id: 'tip.small', title: 'Small tip', priceString: '\$1.00'),
  TipProduct(id: 'tip.medium', title: 'Medium tip', priceString: '\$5.00'),
  TipProduct(id: 'tip.large', title: 'Large tip', priceString: '\$10.00'),
];

ContributionCalendar testCalendar({
  int year = 2024,
  String username = 'octocat',
  int? totalContributions = 371,
  ContributionLevel level = ContributionLevel.low,
  int? count = 1,
  int? weeks,
}) {
  final grid = ContributionGridService.buildFor(days: const [], year: year);
  final built = grid
      .map(
        (week) => ContributionWeek(
          days: week.days
              .map(
                (day) =>
                    ContributionDay(date: day.date, count: count, level: level),
              )
              .toList(),
        ),
      )
      .toList();

  return ContributionCalendar(
    username: Username(username),
    year: Year(year),
    weeks: weeks == null ? built : built.take(weeks).toList(),
    totalContributions: totalContributions,
  );
}
