# 13. The app's calendar grid is always 53 by 7

Date: 2026-07-26

## Status

Accepted. Amended by [19](0019-an-unknown-count-is-null-in-both-clients.md): a padding day carries a `null` Count, not zero, and the streak and activity figures read the Contribution Level rather than the Count. The lattice decision below still stands.

## Context

A contribution year does not start on a Sunday, so the first and last weeks of any year are partial. The app used to render exactly what it parsed: weeks grouped by walking the parsed days and breaking on Sunday, which produced a ragged grid varying between 52 and 54 columns, with short weeks at both ends.

The web had already solved this by building a fixed lattice and backfilling the days needed to complete the leading and trailing weeks. The two clients therefore disagreed about what a calendar *is*, not merely how it looks, and the glossary defines a Contribution Week as seven consecutive days.

## Decision

After parsing, the app builds the grid the same way the web does: start at the Sunday on or before 1 January, emit 53 whole weeks of 7 days, and fill any date with no parsed data as a day with **no Count**: `count: null`, `level: none`. `ContributionCalendar.weeks` is always 53 by 7 before it reaches anything that renders or measures it.

This originally said "count zero", and the app originally did that. [19](0019-an-unknown-count-is-null-in-both-clients.md) changed it: a date the request never asked about is not a date on which somebody did nothing, and the two are now different values.

## Consequences

- **Anything dividing by `weeks.length` now divides by a constant.** `ContributionStatsService` computes the weekly average that way, so the number shifts slightly for calendars that previously had 52 or 54 weeks. This is a visible change to a figure the user reads, and it is the price of the two clients agreeing.
- **Padding days carry no Count, and the figures that could have been distorted by that read the Contribution Level instead.** `ContributionDay.isActive` is `level != ContributionLevel.none`, and `StreakService` and `ContributionStatsService` both branch on it, never on `count > 0`. That is what keeps `totalDaysActive` and the streaks unaffected by the padding. The original wording here claimed the opposite mechanism, and was wrong from the moment [19](0019-an-unknown-count-is-null-in-both-clients.md) landed.
- The padded days come from adjacent years. They are deliberately synthesised as empty rather than fetched, because the request is scoped to one year.
- `CalendarWidgetService` writes `weeks.length` to the home-screen widget, which is now constant. Widget layout can rely on that.
