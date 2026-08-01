# 13. The app's calendar grid is always 53 by 7

Date: 2026-07-26

## Status

Accepted.

## Context

A contribution year does not start on a Sunday, so the first and last weeks of any year are partial. The app used to render exactly what it parsed: weeks grouped by walking the parsed days and breaking on Sunday, which produced a ragged grid varying between 52 and 54 columns, with short weeks at both ends.

The web had already solved this by building a fixed lattice and backfilling the days needed to complete the leading and trailing weeks. The two clients therefore disagreed about what a calendar *is*, not merely how it looks — and the glossary defines a Contribution Week as seven consecutive days.

## Decision

After parsing, the app builds the grid the same way the web does: start at the Sunday on or before 1 January, emit 53 whole weeks of 7 days, and fill any date with no parsed data as an empty day — count zero, level none. `ContributionCalendar.weeks` is always 53 by 7 before it reaches anything that renders or measures it.

## Consequences

- **Anything dividing by `weeks.length` now divides by a constant.** `ContributionStatsService` computes the weekly average that way, so the number shifts slightly for calendars that previously had 52 or 54 weeks. This is a visible change to a figure the user reads, and it is the price of the two clients agreeing.
- Padding days carry count zero, so `totalDaysActive` and the streak calculations are unaffected — they count days with a count above zero.
- The padded days come from adjacent years. They are deliberately synthesised as empty rather than fetched, because the request is scoped to one year.
- `CalendarWidgetService` writes `weeks.length` to the home-screen widget, which is now constant. Widget layout can rely on that.
