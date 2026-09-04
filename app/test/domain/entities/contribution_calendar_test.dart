import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/entities/contribution_day.dart';
import 'package:contribkit/domain/entities/contribution_week.dart';
import 'package:contribkit/domain/value_objects/contribution_level.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:flutter_test/flutter_test.dart';

ContributionDay _day(int day) => ContributionDay(
  date: DateTime(2024, 1, day),
  count: day,
  level: ContributionLevel.low,
);

ContributionCalendar _calendar() => ContributionCalendar(
  username: Username('octocat'),
  year: Year(2024),
  weeks: [
    ContributionWeek(days: [_day(1), _day(2)]),
  ],
  totalContributions: 3,
);

void main() {
  group('a calendar cannot be changed after it is built', () {
    test(
      'because equality and every Riverpod rebuild ride on its contents',
      () {
        final calendar = _calendar();

        expect(calendar.weeks.clear, throwsUnsupportedError);
        expect(() => calendar.weeks.first.days.clear(), throwsUnsupportedError);
      },
    );

    test(
      'so a holder cannot silently change what it already compared equal to',
      () {
        final calendar = _calendar();
        final before = calendar.hashCode;

        expect(calendar.weeks.removeLast, throwsUnsupportedError);
        expect(calendar.hashCode, before);
      },
    );
  });

  group('a week cannot be changed after it is built', () {
    test('because its whole state is its days', () {
      final week = ContributionWeek(days: [_day(1)]);

      expect(() => week.days.add(_day(2)), throwsUnsupportedError);
    });
  });

  group('what makes two Contribution Calendars the same one', () {
    test(
      'a different week in the same position makes it a different calendar',
      () {
        final left = _calendar();
        final right = ContributionCalendar(
          username: left.username,
          year: left.year,
          totalContributions: left.totalContributions,
          weeks: [
            ContributionWeek(
              days: [
                ContributionDay(
                  date: DateTime.utc(2024, 1, 1),
                  count: 99,
                  level: ContributionLevel.veryHigh,
                ),
              ],
            ),
            ...left.weeks.skip(1),
          ],
        );

        expect(right, isNot(left));
      },
    );

    test('a different number of weeks makes it a different calendar', () {
      final left = _calendar();

      expect(
        ContributionCalendar(
          username: left.username,
          year: left.year,
          totalContributions: left.totalContributions,
          weeks: const <ContributionWeek>[],
        ),
        isNot(left),
      );
    });

    test('is not equal to something that merely looks like one', () {
      expect(_calendar(), isNot('octocat'));
    });
  });
}
