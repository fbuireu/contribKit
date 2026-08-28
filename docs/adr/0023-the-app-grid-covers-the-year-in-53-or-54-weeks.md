# 23. The app grid covers the Year, in 53 or 54 weeks

Date: 2026-08-28

## Status

Accepted. Supersedes [13](0013-the-app-grid-is-always-53-by-7.md), which fixed the lattice at 53 weeks. Everything else 13 decided still holds: the grid is whole Sunday-aligned Contribution Weeks, and a date the request never asked about is padded with no Count, as [19](0019-an-unknown-count-is-null-in-both-clients.md) specified.

## Context

[13](0013-the-app-grid-is-always-53-by-7.md) fixed the lattice at 53 weeks of 7 days, anchored on the Sunday on or before 1 January. That is 371 cells, and it is one short of what some years need.

The cells a Year requires are its leading offset plus its length. The offset is how far 1 January sits from the Sunday before it, which is 6 when the Year opens on a Saturday. A leap Year opening on a Saturday therefore needs `6 + 366 = 372` cells, and 371 cannot hold it. Between 2005, the earliest Year the app offers, and 2060, exactly two Years are in that position: **2028** and **2056**.

The effect was silent. `ContributionGridService.buildFor` parsed 31 December, entered it into its date map, and then never emitted it: the loop stopped one day early. The day vanished from the Viewer, both Exports and the Home Screen Widget, `StreakService` anchored on 30 December so a live streak read short, and `_totalFor` still counted the day, so the header figure and the grid contradicted each other with nothing failing.

The existing test could not catch it. It looped 2019 to 2026, stopping two Years short of the first failing case, and asserted only where the lattice *started*, never that the Year was covered.

Shortening the leading offset instead of adding a week does not help: anchoring on the Sunday *after* 1 January loses 1 January instead of 31 December. A Sunday-aligned lattice of whole weeks genuinely cannot hold such a Year in 53 columns.

## Decision

The lattice covers the Year. `ContributionGridService.weeksFor(year)` answers how many whole weeks that takes, which is `ceil((leadingOffset + daysInYear) / 7)`: 53 for every Year the app offers except 2028 and 2056, where it is 54. `buildFor` emits that many weeks, still anchored on the Sunday on or before 1 January and still padding unparsed dates with `count: null, level: none`.

`weeksPerYear` is gone. A constant is what made the defect expressible, so nothing may read a fixed week count any more: `ExportGeometryService` takes `weeks` as a **required** parameter rather than defaulting to 53, and the Export sheet's format tile passes `calendar.weeks.length` like the two renderers already did.

## Consequences

- **The Home Screen Widget's payload is no longer fixed-width, so a torn write is now possible rather than impossible.** `CalendarWidgetService` writes `widget_weeks` and `widget_levels` separately, and 13 argued the pair could never disagree because both were constant. Across a Year change into or out of 2028 they can. The Kotlin side already guards it: `renderGrid` reads `widget_weeks` for its column count and bounds every lookup with `idx < levels.length`, so a stale pair paints the overflow as level 0 for one frame and self-heals on the next broadcast. That is the same class of transient as the Palette tear 13 accepted, not a crash, but it is a real tear where there was none, and it is the price of the grid being honest about the Year.
- **`weeks.length` is no longer a constant, and the figures that divide by it are correct precisely because it is not.** `ContributionStatsService`'s weekly average divides by the Year's real week count. For 2028 that is 54 rather than 53, which is the right denominator.
- **Two Exports change size in 2028 and 2056.** They already asked the geometry service for their dimensions and passed the calendar's own week count, so they follow automatically; the format tile did not and now does. A PNG for 2028 is one column wider than one for 2029.
- The web is unaffected. It builds its own grid from `GRID_CELL_COUNT`, and whether it should follow is a separate question this decision does not answer.

## Notes

`weeksFor` computes the leap Year from the calendar rule rather than from a `DateTime` difference, because a difference in days crosses daylight saving and truncates.
