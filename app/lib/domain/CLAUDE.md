# app/lib/domain

The business core, in pure Dart. Zero external dependencies: no Flutter, no Riverpod, no `dart:ui`. It is the other
half of a domain implemented twice — the TypeScript mirror is
[`web/src/domain/`](../../../web/src/domain/CLAUDE.md), and the two are meant to stay diffable concept by concept
([ADR 0003](../../../docs/adr/0003-layered-domain-architecture-in-both-clients.md)).

The vocabulary these types are named after is [`CONTEXT.md`](../../../CONTEXT.md), and it is prescriptive: an
identifier that says something an `_Avoid_` list names is the thing that is wrong.

## Invariants & rules

- **No third-party packages.** Only `dart:core` and `dart:async` from the SDK; the only `package:` imports are
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
| `ContributionDay.count` | **`int` — non-nullable** | `number \| null` |
| Total | `int` | `number \| null` |

**The app cannot represent an unknown Count.** A day with no tool-tip becomes `0`, which is indistinguishable from a
genuine zero — the one place the product does invent data, recorded rather than fixed
([ADR 0008](../../../docs/adr/0008-the-mobile-app-fetches-github-directly.md)). Anything that would make that
visible as an exact figure is a bug; anything that closes it means making `count` nullable and following the type
through the DTOs, the stats service and the widget.

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
- **The current streak walks backwards from today, in local time.** `_dateOnly` truncates `DateTime.now()`, trailing
  days after today are skipped, and **today itself is skipped while its count is still `0`** — otherwise a streak
  would appear to break at midnight over a day that has not happened yet. The web's `computeContributionStats` makes
  the same allowance, keyed on the level rather than the count.

## Gotchas

- **`Username` accepts consecutive hyphens; GitHub does not.** `a--b` constructs cleanly and then 404s upstream. The
  web's regex is loose in the same way, on purpose — a truthful "user not found" beats a misleading "invalid
  username" for any handle GitHub later starts allowing.
- **The app's length check is separate from its pattern.** `[a-zA-Z0-9-]*` is unbounded, so the explicit
  `trimmed.length > 39` guard is the only thing enforcing the limit. Deleting it as "already covered by the regex"
  would silently accept a 200-character handle. The web bounds the length inside the pattern instead.
- **Streaks count `day.count > 0`, not `level > ContributionLevel.none`.** Since an unknown Count arrives as `0`,
  a day GitHub knows about but whose tool-tip did not parse breaks a streak. Making `count` nullable would change
  these numbers.
- **`bestDayDate` and `bestMonth` are nullable and are `null` for an empty or wholly inactive calendar.** They
  are the only optional fields in `ContributionStats`; a UI that force-unwraps either will crash on a brand-new
  account.
- `ContributionCalendar` and `ContributionWeek` each carry a private `_listEquals`, because Dart's `==` on `List` is
  identity. Any new entity holding a list needs the same treatment or its equality is quietly wrong — and Riverpod
  rebuilds hang off exactly that comparison.
