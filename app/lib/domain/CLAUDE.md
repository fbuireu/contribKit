# app/lib/domain

The business core, in pure Dart. Zero external dependencies: no Flutter, no Riverpod, no `dart:ui`. It is the other
half of a domain implemented twice — the TypeScript mirror is
[`web/src/domain/`](../../../web/src/domain/CLAUDE.md), and the two are meant to stay diffable concept by concept
([ADR 0003](../../../docs/adr/0003-layered-domain-architecture-in-both-clients.md)).

The vocabulary these types are named after is [`CONTEXT.md`](../../../CONTEXT.md), and it is prescriptive: an
identifier that says something an `_Avoid_` list names is the thing that is wrong.

## Invariants & rules

- **No third-party packages.** Only `dart:core`, `dart:async` and `dart:math` from the SDK — `dart:math` for
  `CellGeometryService` alone, which is trigonometry and not a framework dependency; the only `package:` imports are
  this project's own (`package:contribkit/domain/…`), which is how every file here reaches its siblings.
- **Colours are the project's own `Color` value object**, a wrapper over an ARGB `int`, never `dart:ui.Color`. That
  single rule is what keeps this layer compilable without Flutter; the conversion to a Flutter colour happens in the
  widgets that paint.
- **The value objects that can be invalid validate on construction**, and the ones that carry data compare by
  value. Neither is universal, and the difference matters: `Username` and `Year` reject bad input in their factory,
  and so does `Color.fromHex`, which throws `ArgumentError` on anything that is not 6 or 8 hex digits — though
  `Color`'s primary constructor takes any `int` unchecked. `TipProduct` and `ContributionStats` validate nothing. `Username`, `Year`, `Color` and
  `Palette` override `==` and `hashCode`; `TipProduct` compares by `id` alone; **`ContributionStats` overrides
  neither**, so two identical instances are unequal — which is why it must not be put in a Riverpod state that
  rebuilds on equality. `CellShape`, `CellSize` and `ContributionLevel` are plain enums and need nothing.
- **Errors are `Failure` subclasses**, never a raw `Exception` or a `String` — with the one documented exception
  below.
- **Repositories are `abstract interface class` only.** Six of them live here; every implementation is in
  `infrastructure/`.

## Two error channels, and the difference matters

`Failure` is a `sealed class` implementing `Exception`, thrown by operations and matched exhaustively without a
wildcard ([ADR 0004](../../../docs/adr/0004-typed-failures-instead-of-thrown-exceptions.md)):

`NetworkFailure` · `NotFoundFailure` · `RateLimitedFailure` · `ParseFailure` · `CacheFailure` · `ExportFailure` ·
`PurchaseFailure` · `UnexpectedFailure`

**Value-object constructors do not throw those.** `Username` throws `ArgumentError`, `Year` throws `RangeError`.
That is intentional and worth stating because it looks like a violation: a `Failure` describes something that went
wrong at runtime and that a user should be told about, while an invalid `Username` reaching the constructor is a
programmer error — the input should have been validated at the UI boundary before a value object was ever asked for.
Anything catching `Failure` and expecting to catch a bad username is wrong.

`sealed` is doing real work here: adding a subclass turns every `switch` over `Failure` into a compile error until
it is handled. **Never widen one with `_` to silence the compiler.**

## Value objects

| Type | Rule |
| --- | --- |
| `Username` | trimmed; non-empty; at most 39 characters, checked separately from the pattern; `^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$` |
| `Year` | integer in `Year.minYear` (2005) … the current year, else `RangeError`. `Year.current` is the shorthand |
| `CellSize` | `compact` / `normal` / `large`, each mapping to a `pixels` and a `gap` |
| `CellShape`, `Palette`, `ContributionLevel`, `ContributionStats`, `TipProduct`, `Color` | — |

`Year.minYear` is **2005**, a product floor rather than GitHub's launch year — GitHub launched in 2008, and four
documents once claimed otherwise. Do not "correct" it.

**`ContributionLevel` is an enum here and a `0–4` union on the web.** Both are five bands in the same order; the
representations differ because the languages do. Anything serialising a level has to pick a side explicitly.

## Entities, and where they differ from the web's

| | App | Web |
| --- | --- | --- |
| Calendar holds | `List<ContributionWeek>` | a flat `readonly ContributionDay[]` |
| Calendar carries | `Username`, `Year`, `totalContributions` | `string` username, `days`, `total` |
| `ContributionDay.count` | `int?` | `number \| null` |
| Total | `int?` | `number \| null` |

**An unknown Count is `null`, and `null` is not `0`** — the glossary's distinction, now expressible on both sides
([ADR 0019](../../../docs/adr/0019-an-unknown-count-is-null-in-both-clients.md)).
A day whose tool-tip carried no number, and a day the scrape never mentioned, both arrive as `null`; the Contribution
Grid pads with `null` too, because a day outside the requested Year is not a day with no contributions.

Two rules follow, and they are the whole reason the type changed:

- **Activity is a Contribution Level question, not a Count question.** `ContributionDay.isActive` is
  `level != ContributionLevel.none`. A day GitHub coloured but whose Count did not parse is active, and it neither
  breaks a Streak nor drops out of `totalDaysActive`. It used to do both, because it arrived as `0`.
- **Total Contributions is `null` the moment an active day has an unknown Count.** A sum that skipped those days
  would be a lower bound presented as a measurement. `formatTotalContributions` in `ui/` prints it as `unknown`,
  never as a figure — the same word, for the same reason, as the web's function of that name.

The week-based shape is what makes `ContributionStatsService`'s `weeklyAverage` a simple division: the grid is
always 53×7, so `weeks.length` is a constant and never a partial year
([ADR 0013](../../../docs/adr/0013-the-app-grid-is-always-53-by-7.md)).

## Services

- **`ContributionLevelService.levelFor({ count, yearMax })`** buckets a count into a level by ratio: `0` → `none`,
  then `<= 0.25` → `low`, `<= 0.50` → `medium`, `<= 0.75` → `high`, else `veryHigh`, with `yearMax == 0` short-
  circuiting to `low`. **GitHub does not publish its bucketing algorithm; this matches observed behaviour and is a
  guess.** It is only ever a fallback — the parser reads `data-level` and this runs solely when that attribute is
  missing. The web has no equivalent, because it drops such a day and lets the grid backfill it.
- **`ContributionStatsService.compute(calendar)`** returns the full `ContributionStats`: current and longest streak,
  best day and its date, active days, weekly average, best month and its total. The web's `ContributionStats` shares
  exactly **two** of those eight — the two streaks — and adds a `totalContributions` the app keeps on the calendar
  rather than in its stats. The remaining six are an unbuilt half, not a decision. So is most of this one: `StatsPanel` reads
  `currentStreak` and `longestStreak` and nothing else, so six of the eight figures are computed on every call and
  shown nowhere. They are in the glossary's definition of Contribution Stats, so they stay; they are just not wired
  up yet.
- **`bestMonth` is a month number, 1–12**, straight out of `DateTime.month`. It was called `bestMonthIndex`, which
  invited a zero-based read and an off-by-one against any month-name table. The field is `null` only when no day in
  the calendar has a count above zero.
- **`StreakService.currentFor` owns the current streak, and it is the only copy.** `ContributionStatsService` and
  `CalendarWidgetService` both call it, so the Viewer and the Home Screen Widget cannot drift apart. It takes
  `today` rather than reading the clock, which is what makes it testable at all — the rule had no test before,
  precisely because there was no way to say what day it was.
- **It anchors on the last day belonging to the calendar's Year, capped at today.** That is the whole fix for past
  Years. The Contribution Grid pads the days on either side of the Year with an unknown Count, so a walk back from
  `DateTime.now()` — or from the end of the padded day list — hit a zero immediately and returned **0** for every
  past Year. `StatsPanel` labels that figure `FINAL`, so a year that closed on a forty-day run read as `FINAL 0 day
  streak`. Days outside `calendar.year` are dropped before the walk begins.
- **Trailing days after the anchor are skipped, and the anchor day itself is skipped while its count is `0`** —
  otherwise a streak would appear to break at midnight over a day that has not happened yet. The web's
  `computeContributionStats` makes the same allowance, keyed on the level rather than the count.

## `CellGeometryService` — one Cell, four renderers

The maths a Cell Shape is drawn with lives here, not in whichever renderer needs it: `cornerRadiusFor`,
`dotRadiusFor` and `hexVerticesFor`. The on-screen Cell, the SVG Export and the PNG Export all call all three.

**It exists because the four copies had drifted.** The dot radius and the hex vertices agreed everywhere, but the
rounded corner did not: the exports and the Android widget scaled it with the Cell Size (`cell * 0.2`) while the
screen drew a fixed `2.0`. At the `large` Cell Size that is 2.8 against 2.0 — you chose a look, exported it, and
the corners changed. The screen was the outlier, so the screen moved.

`ContribKitWidgetProvider.kt` is the fourth copy and cannot import Dart, so it stays a deliberate mirror. If a
constant here changes, that file changes in the same commit.

## Gotchas

- **`Username` accepts consecutive hyphens; GitHub does not.** `a--b` constructs cleanly and then 404s upstream. The
  web's regex is loose in the same way, on purpose — a truthful "user not found" beats a misleading "invalid
  username" for any handle GitHub later starts allowing.
- **The app's length check is separate from its pattern.** `[a-zA-Z0-9-]*` is unbounded, so the explicit
  `trimmed.length > 39` guard is the only thing enforcing the limit. Deleting it as "already covered by the regex"
  would silently accept a 200-character handle. The web bounds the length inside the pattern instead.
- **Streaks read `day.isActive`, not `day.count > 0`.** They keyed on the Count until the Count could be unknown,
  which meant a day GitHub had coloured broke a run whenever its tool-tip failed to parse — and made the app
  disagree with the web, which has always keyed on the level.
- **`bestDayDate` and `bestMonth` are nullable and are `null` for an empty or wholly inactive calendar.** They
  are the only optional fields in `ContributionStats`; a UI that force-unwraps either will crash on a brand-new
  account.
- `ContributionCalendar` and `ContributionWeek` each carry a private `_listEquals`, because Dart's `==` on `List` is
  identity. Any new entity holding a list needs the same treatment or its equality is quietly wrong — and Riverpod
  rebuilds hang off exactly that comparison.
