# Calendar Grid

GitHub's contribution calendar is always a fixed **53 weeks × 7 days** grid. ContribKit builds that grid deterministically so rendering is stable regardless of which days GitHub actually returned. The logic lives in [`web/src/domain/services/calendar-grid.ts`](../../web/src/domain/services/calendar-grid.ts).

```mermaid
---
config:
  look: handDrawn
---
flowchart LR
    start["year-01-01"] --> sunday["shift back to the<br/>Sunday on/before"]
    sunday --> walk["walk forward<br/>371 days"]
    walk --> grid["53 weeks × 7 days<br/>= 371 cells"]
```

`GRID_CELL_COUNT = WEEKS_PER_YEAR (53) × DAYS_PER_WEEK (7) = 371` cells. All three are declared in [`web/src/domain/services/dates.ts`](../../web/src/domain/services/dates.ts).

---

## Aligning to week boundaries

A year doesn't start on a Sunday, so the grid starts on the **Sunday on or before** January 1st of the target year:

```
start = (year-01-01) shifted back by getWeekday(year-01-01) days
```

From `start`, it walks forward exactly `GRID_CELL_COUNT` days, producing one `ContributionDay` per cell. Date math is pure ISO-string arithmetic in `web/src/domain/services/dates.ts`:

| Helper | Behavior |
|--------|----------|
| `getWeekday(iso)` | `0`–`6` (Sun–Sat) via `Date.getDay()` |
| `addDays({ iso, days })` | shifts an ISO date by N days |
| `toIsoDate(date)` | `YYYY-MM-DD` from the **local** calendar fields |

The two that construct a date (`getWeekday` and `addDays`) do it at **`T12:00:00`** (local noon) rather than midnight; `toIsoDate` builds no `Date` at all, it formats one out of its local calendar fields. Anchoring at noon avoids off-by-one errors where a DST transition or timezone offset would otherwise push a midnight timestamp into the previous/next day.

### Worked example

`2024-01-01` is a Monday, so `getWeekday("2024-01-01") === 1`. The grid starts one day earlier, on Sunday `2023-12-31`, then walks 371 days forward to fill 53 full weeks. Days that fall outside 2024 (the trailing Sunday of 2023, the leading days of 2025) simply have no entry in the map and render as level 0.

---

## Filling cells

Parsed days are first turned into a lookup map keyed by ISO date:

```mermaid
---
config:
  look: handDrawn
---
flowchart LR
    days["buildGridFromApi<br/>({ days, year })"] --> map["map: date →<br/>{ level, count }"]
    map --> build["walk 371 days<br/>from the anchoring Sunday"]
```

For each of the 371 positions:

- look up the date in the map,
- if present, use its `level` (run through `clampLevel`) and `count`,
- if absent, emit `{ level: 0, count: null }`.

This guarantees a complete, gap-free grid even when GitHub omits leading/trailing days outside the year. **An absent day is not a zero day**: it is a day with an unknown Count that happens to render like an empty one ([ADR 0019](../adr/0019-an-unknown-count-is-null-in-both-clients.md)).

---

## The other builder: `buildRollingGrid`

`buildGridFromApi` anchors on a calendar Year. The Embed does not have one. `/user/:username.svg` ignores `?year=` entirely, because an embed URL is pasted into a README once and a pinned year would quietly go stale. So it uses **`buildRollingGrid`**, which keys the days by date and ends on the Saturday of the latest day it was given rather than on 31 December.

It is not optional there. GitHub emits its table **weekday-major**, so the scraped days arrive as fifty-three Sundays, then fifty-three Mondays; handing them straight to a renderer draws the transpose of the calendar, every cell after the first carrying the wrong date's Contribution Level. Anything that reaches a renderer goes through a grid builder first: the rolling one for the Embed, the Year-anchored one everywhere else.

Never reach for `chunkWeeks` alone: it trusts its input to already be a date-ordered lattice.

---

## Why deterministic matters

Because the grid is derived purely from the date and the parsed map, the same input always yields the same output. That keeps SVG rendering reproducible and cacheable, and makes the grid trivially unit-testable. (Placeholder/skeleton grids in the UI use a seeded PRNG for the same reason; see **[Deterministic Randomness](Mulberry32)**.)

---

## See also

- **[HTML Parsing](HTML-Parsing)** produces the days fed into the grid.
- **[SVG Rendering](SVG-Rendering)** lays the grid out and draws it: `calendarLayout` does the chunking, not the renderers.
