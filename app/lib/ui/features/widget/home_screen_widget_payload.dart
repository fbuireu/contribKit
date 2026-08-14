import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/services/contribution_grid_service.dart';
import 'package:contribkit/domain/services/streak_service.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/contribution_level.dart';
import 'package:contribkit/domain/value_objects/palette.dart';

abstract final class HomeScreenWidgetKey {
  static const levels = 'widget_levels';
  static const weeks = 'widget_weeks';
  static const colors = 'widget_colors';
  static const shape = 'widget_shape';
  static const username = 'widget_username';
  static const streak = 'widget_streak';
  static const totalContributions = 'widget_total_contributions';
}

const homeScreenWidgetColorSeparator = ',';

final class HomeScreenWidgetPayload {
  const HomeScreenWidgetPayload({
    required this.levels,
    required this.weeks,
    required this.colors,
    required this.shape,
    required this.username,
    required this.streak,
    required this.totalContributions,
  });

  factory HomeScreenWidgetPayload.from({
    required ContributionCalendar calendar,
    required Palette palette,
    required CellShape cellShape,
    required DateTime today,
  }) => HomeScreenWidgetPayload(
    levels: encodeLevels(calendar),
    weeks: calendar.weeks.length,
    colors: encodeColors(palette),
    shape: cellShape.name,
    username: calendar.username.value,
    streak: StreakService.currentFor(calendar: calendar, today: today),
    totalContributions: calendar.totalContributions,
  );

  static String encodeLevels(ContributionCalendar calendar) {
    final buffer = StringBuffer();
    for (final week in calendar.weeks) {
      for (var day = 0; day < ContributionGridService.daysPerWeek; day++) {
        buffer.write(
          day < week.days.length
              ? week.days[day].level.index
              : ContributionLevel.none.index,
        );
      }
    }
    return buffer.toString();
  }

  static String encodeColors(Palette palette) => [
    for (final level in ContributionLevel.values) palette.colorFor(level).argb,
  ].join(homeScreenWidgetColorSeparator);

  final String levels;
  final int weeks;
  final String colors;
  final String shape;
  final String username;
  final int streak;
  final int? totalContributions;
}
