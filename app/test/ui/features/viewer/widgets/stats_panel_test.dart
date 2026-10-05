import 'package:contribkit/domain/value_objects/contribution_stats.dart';
import 'package:contribkit/ui/features/viewer/widgets/contribution_format.dart';
import 'package:contribkit/ui/features/viewer/widgets/stats_panel.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';
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
          today: testToday,
        ),
      );

      expect(find.text('1,234'), findsOneWidget);
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
          today: testToday,
        ),
      );

      expect(find.text(unknownTotalContributionsText), findsOneWidget);
      expect(find.text('0'), findsNothing);
    });

    testWidgets('a past year has no current streak, so the tile says FINAL', (
      tester,
    ) async {
      await pumpHosted(
        tester,
        child: StatsPanel(
          calendar: testCalendar(year: 2020),
          stats: _stats(),
          today: testToday,
        ),
      );

      expect(find.text('FINAL'), findsOneWidget);
      expect(find.text('CURRENT'), findsNothing);
    });

    testWidgets('the running year says CURRENT instead', (tester) async {
      await pumpHosted(
        tester,
        child: StatsPanel(
          calendar: testCalendar(year: testToday.year),
          stats: _stats(),
          today: testToday,
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
        child: StatsPanel(
          calendar: testCalendar(),
          stats: _stats(),
          today: testToday,
        ),
      );

      expect(find.text('TOTAL CONTRIBUTIONS'), findsOneWidget);
      expect(find.text('LONGEST'), findsOneWidget);
    });

    testWidgets('names the Total with the glossary term, not a short form', (
      tester,
    ) async {
      await pumpHosted(
        tester,
        child: StatsPanel(
          calendar: testCalendar(),
          stats: _stats(),
          today: testToday,
        ),
      );

      expect(find.text('TOTAL CONTRIBUTIONS'), findsOneWidget);
      expect(find.text('TOTAL'), findsNothing);
      expect(find.text('contributions'), findsNothing);
    });

    testWidgets(
      'gives the Total a full-width row of its own above the Streaks',
      (tester) async {
        await pumpHosted(
          tester,
          child: StatsPanel(
            calendar: testCalendar(
              year: testToday.year,
              totalContributions: 1234,
            ),
            stats: _stats(),
            today: testToday,
          ),
        );

        final panel = tester.getRect(find.byType(StatsPanel));
        final total = tester.getRect(_tile('TOTAL CONTRIBUTIONS'));
        final current = tester.getRect(_tile('CURRENT'));
        final longest = tester.getRect(_tile('LONGEST'));

        expect(total.left, panel.left);
        expect(total.right, panel.right);
        expect(current.top, greaterThanOrEqualTo(total.bottom));
        expect(longest.top, current.top);
        expect(current.left, panel.left);
        expect(longest.right, panel.right);
        expect(current.width, closeTo(longest.width, 0.01));
      },
    );

    for (final width in _widths) {
      testWidgets(
        'keeps the term and the figure on one line on a ${width.toInt()} wide screen',
        (tester) async {
          await _pumpOnScreen(tester, width: width, scale: 1);

          for (final text in ['TOTAL CONTRIBUTIONS', '1,234']) {
            expect(_lineCount(tester, text: text), 1, reason: text);
          }
        },
      );
    }

    for (final width in _widths) {
      for (final scale in _scales) {
        testWidgets(
          'overflows nowhere on a ${width.toInt()} wide screen at ${scale}x text',
          (tester) async {
            await _pumpOnScreen(tester, width: width, scale: scale);

            expect(tester.takeException(), isNull);
          },
        );
      }
    }
  });
}

const _widths = [320.0, 360.0, 390.0];

const _scales = [1.0, 1.3, 2.0, 3.0];

Finder _tile(String label) => find
    .ancestor(of: find.text(label), matching: find.byType(DecoratedBox))
    .first;

int _lineCount(WidgetTester tester, {required String text}) {
  final paragraph = tester.renderObject<RenderParagraph>(find.text(text));
  final painter = TextPainter(
    text: paragraph.text,
    textDirection: paragraph.textDirection,
    textScaler: paragraph.textScaler,
  )..layout(maxWidth: paragraph.size.width);
  addTearDown(painter.dispose);
  return painter.computeLineMetrics().length;
}

Future<void> _pumpOnScreen(
  WidgetTester tester, {
  required double width,
  required double scale,
}) async {
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  addTearDown(() => tester.binding.setSurfaceSize(null));
  tester.platformDispatcher.textScaleFactorTestValue = scale;
  await tester.binding.setSurfaceSize(Size(width, 640));

  await pumpHosted(
    tester,
    child: SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: Tokens.space4),
        child: StatsPanel(
          calendar: testCalendar(
            year: testToday.year,
            totalContributions: 1234,
          ),
          stats: _stats(),
          today: testToday,
        ),
      ),
    ),
  );
}
