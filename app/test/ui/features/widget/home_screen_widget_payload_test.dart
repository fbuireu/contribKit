import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/entities/contribution_day.dart';
import 'package:contribkit/domain/entities/contribution_week.dart';
import 'package:contribkit/domain/services/contribution_grid_service.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/color.dart';
import 'package:contribkit/domain/value_objects/contribution_level.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/ui/features/viewer/widgets/contribution_format.dart';
import 'package:contribkit/ui/features/widget/home_screen_widget_payload.dart';
import 'package:flutter_test/flutter_test.dart';

const _palette = Palette(
  key: 'test',
  name: 'Test',
  none: Color(0xFF000001),
  noneLight: Color(0xFF000002),
  low: Color(0xFF000003),
  medium: Color(0xFF000004),
  high: Color(0xFF000005),
  veryHigh: Color(0xFF000006),
);

ContributionCalendar _calendar({ContributionLevel? level}) {
  final days = ContributionGridService.buildFor(days: const [], year: 2024);
  final weeks = level == null
      ? days
      : days
            .map(
              (week) => ContributionWeek(
                days: week.days
                    .map(
                      (day) => ContributionDay(
                        date: day.date,
                        count: 1,
                        level: level,
                      ),
                    )
                    .toList(),
              ),
            )
            .toList();

  return ContributionCalendar(
    username: Username('torvalds'),
    year: Year(2024),
    weeks: weeks,
    totalContributions: 7,
  );
}

void main() {
  group('the Contribution Level order is the wire format', () {
    test('ContribKitWidgetProvider.kt indexes both payloads by this order', () {
      expect(
        ContributionLevel.values.map((level) => level.name).toList(),
        ['none', 'low', 'medium', 'high', 'veryHigh'],
        reason: '''
widget_levels writes level.index as a digit per day and widget_colors is a
comma-joined list in this order. The Kotlin side reads both positionally, so
reordering this enum silently recolours every Home Screen Widget, and also
changes what every cached calendar means. Change the Kotlin and the cache
version in the same commit, or do not change the order.''',
      );
    });
  });

  group('encodeLevels', () {
    test('writes one digit per day of the whole grid', () {
      expect(
        HomeScreenWidgetPayload.encodeLevels(_calendar()),
        hasLength(
          ContributionGridService.weeksFor(2024) *
              ContributionGridService.daysPerWeek,
        ),
      );
    });

    test('writes the Contribution Level index, not the Count', () {
      final levels = HomeScreenWidgetPayload.encodeLevels(
        _calendar(level: ContributionLevel.high),
      );

      expect(levels.split('').toSet(), {
        ContributionLevel.high.index.toString(),
      });
    });

    test('writes an empty day as level zero', () {
      expect(
        HomeScreenWidgetPayload.encodeLevels(_calendar()).split('').toSet(),
        {'0'},
      );
    });
  });

  group('encodeColors', () {
    test('emits one colour per Contribution Level, in enum order', () {
      final colors = HomeScreenWidgetPayload.encodeColors(_palette).split(',');

      expect(colors, hasLength(ContributionLevel.values.length));
      expect(colors.first, _palette.none.argb.toString());
      expect(colors.last, _palette.veryHigh.argb.toString());
    });

    test('sends the dark none, so noneLight never reaches the widget', () {
      final colors = HomeScreenWidgetPayload.encodeColors(_palette).split(',');

      expect(colors.first, isNot(_palette.noneLight.argb.toString()));
    });
  });

  group('from', () {
    test('carries the week count the Kotlin side lays the grid out with', () {
      final payload = HomeScreenWidgetPayload.from(
        calendar: _calendar(),
        palette: _palette,
        cellShape: CellShape.rounded,
        today: DateTime(2026, 8, 14),
      );

      expect(payload.weeks, ContributionGridService.weeksFor(2024));
      expect(
        payload.levels,
        hasLength(payload.weeks * ContributionGridService.daysPerWeek),
      );
    });

    test('names the Cell Shape by its enum name, which Kotlin matches on', () {
      final payload = HomeScreenWidgetPayload.from(
        calendar: _calendar(),
        palette: _palette,
        cellShape: CellShape.hex,
        today: DateTime(2026, 8, 14),
      );

      expect(payload.shape, 'hex');
    });

    test('sends the wording for an unknown Total, not an absent value', () {
      final calendar = _calendar();
      final payload = HomeScreenWidgetPayload.from(
        calendar: ContributionCalendar(
          username: calendar.username,
          year: calendar.year,
          weeks: calendar.weeks,
          totalContributions: null,
        ),
        palette: _palette,
        cellShape: CellShape.rounded,
        today: DateTime(2026, 8, 14),
      );

      expect(payload.totalContributionsText, unknownTotalPhrase);
      expect(payload.totalContributionsText, isNotEmpty);
    });

    test('sends a measured Total as a finished sentence', () {
      final payload = HomeScreenWidgetPayload.from(
        calendar: _calendar(),
        palette: _palette,
        cellShape: CellShape.rounded,
        today: DateTime(2026, 8, 14),
      );

      expect(payload.totalContributionsText, '7 contributions this year');
    });

    test(
      'never sends an empty string, which Kotlin cannot tell from absent',
      () {
        for (final total in [null, 0, 42]) {
          expect(HomeScreenWidgetPayload.encodeTotal(total), isNotEmpty);
        }
      },
    );
  });
  group('the Cell Shape crosses as a name Kotlin matches literally', () {
    test(
      'every member sends its own name, so none falls through to rounded',
      () {
        final sent = <String>{};

        for (final shape in CellShape.values) {
          final payload = HomeScreenWidgetPayload.from(
            calendar: _calendar(),
            palette: _palette,
            cellShape: shape,
            today: DateTime(2024, 6, 15),
          );

          expect(payload.shape, shape.name, reason: shape.name);
          sent.add(payload.shape);
        }

        expect(
          sent,
          hasLength(CellShape.values.length),
          reason:
              'drawCell ends in else -> rounded, so two shapes sharing a name '
              'would draw identically with nothing failing',
        );
      },
    );
  });
  group('levels and weeks agree inside one payload, which is what bounds a torn write', () {
    test("sends the calendar's own week count, whatever it holds", () {
      for (final year in [2019, 2020, 2023, 2024]) {
        final calendar = ContributionCalendar(
          username: Username('octocat'),
          year: Year(year),
          weeks: ContributionGridService.buildFor(days: const [], year: year),
          totalContributions: null,
        );

        final payload = HomeScreenWidgetPayload.from(
          calendar: calendar,
          palette: _palette,
          cellShape: CellShape.rounded,
          today: DateTime(year, 6, 15),
        );

        expect(
          payload.weeks,
          ContributionGridService.weeksFor(2024),
          reason: '$year',
        );
      }
    });

    test('sends exactly weeks x 7 level digits, so the Kotlin bounds check holds', () {
      final calendar = ContributionCalendar(
        username: Username('octocat'),
        year: Year(2024),
        weeks: ContributionGridService.buildFor(days: const [], year: 2024),
        totalContributions: null,
      );

      final payload = HomeScreenWidgetPayload.from(
        calendar: calendar,
        palette: _palette,
        cellShape: CellShape.rounded,
        today: DateTime(2024, 6, 15),
      );

      expect(
        payload.levels.length,
        ContributionGridService.weeksFor(2024) *
            ContributionGridService.daysPerWeek,
      );
      expect(
        payload.levels.length,
        payload.weeks * ContributionGridService.daysPerWeek,
        reason:
            'CalendarWidgetService writes these two keys separately, so Kotlin '
            'can read a new one beside a stale one. They agree inside one '
            'payload, which is what makes idx < levels.length sufficient',
      );
    });
  });
}
