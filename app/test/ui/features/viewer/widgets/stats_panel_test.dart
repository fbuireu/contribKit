import 'package:contribkit/domain/value_objects/contribution_stats.dart';
import 'package:contribkit/ui/features/viewer/widgets/contribution_format.dart';
import 'package:contribkit/ui/features/viewer/widgets/stats_panel.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../../support/fixtures.dart';
import '../../../../support/harness.dart';

ContributionStats _stats({int currentStreak = 4, int longestStreak = 12}) =>
    ContributionStats(
      currentStreak: currentStreak,
      longestStreak: longestStreak,
      bestDayCount: null,
      bestDayDate: null,
      totalDaysActive: 40,
      weeklyAverage: 7.5,
      bestMonthContributions: null,
      bestMonth: null,
    );

void main() {
  group('StatsPanel', () {
    testWidgets('shows the Total, the current streak and the longest', (
      tester,
    ) async {
      await pumpHosted(
        tester,
        child: StatsPanel(
          calendar: testCalendar(year: 2024, totalContributions: 1234),
          stats: _stats(),
        ),
      );

      expect(find.text('1,234'), findsOneWidget);
      expect(find.text('contributions'), findsOneWidget);
      expect(find.text('4'), findsOneWidget);
      expect(find.text('day streak'), findsOneWidget);
      expect(find.text('12'), findsOneWidget);
      expect(find.text('days'), findsOneWidget);
    });

    testWidgets('an unknown Total is said, never shown as zero', (
      tester,
    ) async {
      await pumpHosted(
        tester,
        child: StatsPanel(
          calendar: testCalendar(year: 2024, totalContributions: null),
          stats: _stats(),
        ),
      );

      expect(find.text(unknownTotalText), findsOneWidget);
      expect(find.text('0'), findsNothing);
    });

    testWidgets('a past year has no current streak, so the tile says FINAL', (
      tester,
    ) async {
      await pumpHosted(
        tester,
        child: StatsPanel(calendar: testCalendar(year: 2020), stats: _stats()),
      );

      expect(find.text('FINAL'), findsOneWidget);
      expect(find.text('CURRENT'), findsNothing);
    });

    testWidgets('the running year says CURRENT instead', (tester) async {
      await pumpHosted(
        tester,
        child: StatsPanel(
          calendar: testCalendar(year: DateTime.now().year),
          stats: _stats(),
        ),
      );

      expect(find.text('CURRENT'), findsOneWidget);
      expect(find.text('FINAL'), findsNothing);
    });

    testWidgets('labels every tile, so no number stands unexplained', (
      tester,
    ) async {
      await pumpHosted(
        tester,
        child: StatsPanel(calendar: testCalendar(), stats: _stats()),
      );

      expect(find.text('TOTAL'), findsOneWidget);
      expect(find.text('LONGEST'), findsOneWidget);
    });
  });
}
