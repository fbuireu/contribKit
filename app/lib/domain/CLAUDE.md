# app/lib/domain

The business core, in pure Dart. Zero external dependencies: no Flutter, no Riverpod, no `dart:ui`. It is the other
half of a domain implemented twice: the TypeScript mirror is
[`web/src/domain/`](../../../web/src/domain/CLAUDE.md), and the two are meant to stay diffable concept by concept
([ADR 0003](../../../docs/adr/0003-layered-domain-architecture-in-both-clients.md)).

The vocabulary these types are named after is [`CONTEXT.md`](../../../CONTEXT.md), and it is prescriptive: an
identifier that says something an `_Avoid_` list names is the thing that is wrong.

## Invariants & rules

- **No third-party packages.** Only `dart:core`, `dart:async` and `dart:math` from the SDK: `dart:math` for
  `CellGeometryService` alone, which is trigonometry and not a framework dependency; the only `package:` imports are
  this project's own (`package:contribkit/domain/…`), which is how every file here reaches its siblings.
- **Colours are the project's own `Color` value object**, a wrapper over an ARGB `int`, never `dart:ui.Color`. That
  single rule is what keeps this layer compilable without Flutter; the conversion to a Flutter colour happens in the
  widgets that paint.
- **The value objects that can be invalid validate on construction**, and the ones that carry data compare by
  value. Neither is universal, and the difference matters: `Username` and `Year` reject bad input in their factory,
  and so does `Color.fromHex`, which throws `ArgumentError` on anything that is not 6 or 8 hex digits. It checks
  the characters as well as the length: it used to check only the length, so `'#ZZZZZZ'` reached `int.parse` and
  threw a `FormatException` instead, and the claim on this line was false for every wrong-character input (though
  `Color`'s primary constructor takes any `int` unchecked). `TipProduct` and `ContributionStats` validate nothing. `Username`, `Year`, `Color` and
  `Palette` override `==` and `hashCode`, and so does `ContributionStats`; `TipProduct` compares by `id` alone.
  **`ContributionStats` overrode neither until it started riding on `ViewerState`**, where identity equality would
  have made every state unequal and rebuilt the screen on every notification. A value object carried in Riverpod
  state needs value equality or it is not behaving as one. `CellShape`, `CellSize`, `ExportFormat` and
  `ContributionLevel` are plain enums and need nothing.
  **`AssetPaletteRepository` calls `Color.fromHex`**, and did not always: it carried its own `_hex` that ran
  `hex.substring(1)` unconditionally, so a value without a leading `#` lost its first digit and produced a silently
  wrong colour instead of throwing into the `ParseFailure` that layer exists to raise. The validated parser had no
  production caller at all while the unvalidated copy was the only one running.
- **Errors are `Failure` subclasses**, never a raw `Exception` or a `String`, with the one documented exception
  below.
- **Repositories are `abstract interface class` only.** Six of them live here; every implementation is in
  `infrastructure/`.

## Two error channels, and the difference matters

`Failure` is a `sealed class` implementing `Exception`, thrown by operations and matched exhaustively without a
wildcard ([ADR 0004](../../../docs/adr/0004-typed-failures-instead-of-thrown-exceptions.md)):

`NetworkFailure` · `NotFoundFailure` · `RateLimitedFailure` · `ParseFailure` · `AssetFailure` · `CacheFailure` ·
`ExportFailure` · `TipFailure` · `UnexpectedFailure`

**`AssetFailure` exists because `ParseFailure` meant two different things.** The asset repositories threw
`ParseFailure` when [`assets/palettes.json`](../../assets/palettes.json) could not be read, and `FailureMessage` renders that kind as *"GitHub
changed its contributions page. Please update the app."*: a sentence about the scrape, shown for a file the app
ships with itself. It carries the asset key and says so.

**It is `TipFailure`, not `PurchaseFailure`.** The glossary's `_Avoid_` list for Tip names `purchase`, and the whole
stack was named after it: `PurchaseRepository`, `PurchaseTip`, `PurchaseFailure`, `purchase()`. The
docs-consistency guard could not see it: it policed only `_Avoid_` terms that are *code-shaped* (`ShapeKind`,
`DOW`, `IAP`, `SKU`), which is four of a hundred and six, and every plain lowercase word went unchecked. It now
polices a curated set of unambiguous ones, and `purchase` is in it.

**Value-object constructors do not throw those.** `Username` throws `ArgumentError`, `Year` throws `RangeError`.
That is intentional and worth stating because it looks like a violation: a `Failure` describes something that went
wrong at runtime and that a user should be told about, while an invalid `Username` reaching the constructor is a
programmer error: the input should have been validated at the UI boundary before a value object was ever asked for.
Anything catching `Failure` and expecting to catch a bad username is wrong.

`sealed` is doing real work here: adding a subclass turns every `switch` over `Failure` into a compile error until
it is handled. **Never widen one with `_` to silence the compiler.**

## Value objects

| Type | Rule |
| --- | --- |
| `Username` | trimmed; non-empty; at most 39 characters, checked separately from the pattern; `^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$` |
| `Year` | integer in `Year.minYear` (2005) … the current year, else `RangeError`. `Year.current` is the shorthand |
| `CellSize` | `compact` / `normal` / `large`, each mapping to a `pixels` and a `gap` |
| `ExportFormat` | `png` / `svg` / `markdown`, each carrying its `label`, `mimeType`, `suffix` and `fileNameFor` |
| `TipOutcome` | `completed` / `cancelled`: what came back from the store when a Tip was offered |
| `Embed` | the one spelling of an Embed URL: origin, segment, extension, and which options are worth a query param. It has a TypeScript twin the docs contract diffs it against; see below |
| `AppSettings` | everything the app remembers, already defaulted. `SettingsRepository.load()` returns one, and `year` is `lastYear ?? Year.current` so no caller re-decides that. **No `==`**: nothing compares one, so it would be surface with no reader |
| `CellShape`, `Palette`, `ContributionLevel`, `ContributionStats`, `TipProduct`, `Color` | - |

`Year.minYear` is **2005**, a product floor rather than GitHub's launch year: GitHub launched in 2008, and four
documents once justified the 2005 by calling it the launch year. Do not "correct" it.

**`ExportFormat` is the one value object with no web counterpart.** The web offers the same three Export Formats
from [`ui/components/export/export-formats.ts`](../../../web/src/ui/components/export/export-formats.ts), because there the choice never leaves the browser; here it crosses
from a widget through a provider to a repository, and it used to cross as a private enum each surface declared for
itself. The glossary named it long before any module did.

**`ContributionLevel` is an enum here and a `0–4` union on the web.** Both are five bands in the same order; the
representations differ because the languages do. Anything serialising a level has to pick a side explicitly.

## Entities, and where they differ from the web's

| | App | Web |
| --- | --- | --- |
| Calendar holds | `List<ContributionWeek>` | a flat `readonly ContributionDay[]` |
| Calendar carries | `Username`, `Year`, `totalContributions` | `string` username, `days`, `total` |
| `ContributionDay.count` | `int?` | `number \| null` |
| Total | `int?` | `number \| null` |

**An unknown Count is `null`, and `null` is not `0`**: the glossary's distinction, now expressible on both sides
([ADR 0019](../../../docs/adr/0019-an-unknown-count-is-null-in-both-clients.md)).
A day whose tool-tip carried no number, and a day the scrape never mentioned, both arrive as `null`; the Contribution
Grid pads with `null` too, because a day outside the requested Year is not a day with no contributions.

Two rules follow, and they are the whole reason the type changed:

- **Activity is a Contribution Level question, not a Count question.** `ContributionDay.isActive` is
  `level != ContributionLevel.none`. A day GitHub coloured but whose Count did not parse is active, and it neither
  breaks a Streak nor drops out of `totalDaysActive`. It used to do both, because it arrived as `0`.
- **Total Contributions is `null` the moment an active day has an unknown Count.** A sum that skipped those days
  would be a lower bound presented as a measurement. `formatTotalContributions` in `ui/` prints it as `unknown`,
  never as a figure: the same word, for the same reason, as the web's function of that name.

The week-based shape is what makes `ContributionStatsService`'s `weeklyAverage` a simple division: the grid is
always 53×7, so `weeks.length` is a constant and never a partial year
([ADR 0023](../../../docs/adr/0023-the-app-grid-covers-the-year-in-53-or-54-weeks.md)).

**Every figure derived from Counts is nullable, and `null` means "not knowable" rather than zero.** `weeklyAverage`
is `null` when Total Contributions is; `bestDayCount` and `bestMonthContributions` are `null` the moment any active
day has an unknown Count, because the largest Count *seen* is a lower bound and reporting it as the best day is the
same lie `_totalFor` refuses to tell. `currentStreak`, `longestStreak` and `totalDaysActive` stay
non-nullable: they count *days*, which the Contribution Level answers on its own. `bestMonth` does not count days
(it names the month with the highest summed Count), so it is nulled by the same rule as `bestMonthContributions`,
and it is an `int?`.

**Six of the eight figures have no reader.** `StatsPanel` renders `currentStreak` and `longestStreak`, plus the
calendar's own `totalContributions`, and nothing else in `lib/` touches the rest. They are computed for a surface
that does not exist yet, which is exactly why their handling of an unknown Count was wrong for a while with
nothing going visibly wrong. They are computed **once per Contribution Calendar** now, in `ViewerNotifier`;
`StatsPanel` used to call `ContributionStatsService.compute` from its own `build`, so all eight were re-derived on
every frame and no test could reach the derivation through the notifier at all.

## `Embed` is half of a cross-language contract

`Embed.origin`, `Embed.segment` and `Embed.extension` are the same three strings
[`web/src/domain/value-objects/embed.ts`](../../../web/src/domain/value-objects/embed.ts) exports as `EMBED_ORIGIN`, `EMBED_SEGMENT` and `EMBED_EXTENSION`, because
the Markdown Export writes a URL the web has to serve. Nothing links the two languages, so the docs contract diffs
them: it parses the `static const` values here with a regex and asserts the TypeScript contains each one verbatim.
The defaults are checked too: `defaultPaletteKey` must be `github`, and `defaultShape` must be **the first key in
[`shared/shapes.json`](../../../shared/shapes.json)**, which is what the web derives its own default from. Reordering that file therefore changes
the Dart default as well, and the test is the only thing that will say so.

`Embed.urlFor` takes a Palette key and a Cell Shape and omits either when it equals the default. So does the web's
`buildEmbedUrl`, and neither takes a Background. This used to say the web's builder took one, and justified it by
saying the Customizer had a Background to embed: it does not, it offers a Palette and a Cell Shape and nothing
else, and no production caller ever passed a background. The parameter was dead surface a false sentence kept
alive, and it is gone. The **SVG endpoint** still reads a `background` query parameter, because an Embed URL a
person writes by hand may carry one; what no client does is *build* one.

## Services

- **`ContributionLevelService.levelFor({ count, yearMax })`** buckets a count into a level by ratio: `0` → `none`,
  then `<= 0.25` → `low`, `<= 0.50` → `medium`, `<= 0.75` → `high`, else `veryHigh`, with `yearMax == 0` short-
  circuiting to `low`. **GitHub does not publish its bucketing algorithm; this matches observed behaviour and is a
  guess.** It is only ever a fallback: the parser reads `data-level` and this runs solely when that attribute is
  missing. The web has no equivalent, because it drops such a day and lets the grid backfill it.
  The `yearMax == 0` arm is unreachable from both call sites: it sits after the `count == 0` check, and both
  derive `yearMax` as the maximum over the counts, so a positive count implies a positive maximum. It is kept as a
  total function's answer for an input the callers happen not to produce, not as a live branch.
- **`ContributionGridService.buildFor`** turns a flat list of Contribution Days into a lattice of whole
  Sunday-aligned weeks covering the requested Year, padding every date outside it as a day with no Count
  ([ADR 0023](../../../docs/adr/0023-the-app-grid-covers-the-year-in-53-or-54-weeks.md)). `weeksFor` answers how many weeks that
  takes: 53 for every Year the app offers except 2028 and 2056, where a leap Year opening on a Saturday needs 372
  cells and 53 × 7 is 371. There is deliberately **no** `weeksPerYear` constant, because a constant is what let
  the grid drop 31 December 2028 in silence. `daysPerWeek` is declared here and is 7.
  [ADR 0013](../../../docs/adr/0013-the-app-grid-is-always-53-by-7.md) is the superseded decision that fixed
  the lattice at 53, and is worth reading for why the lattice exists at all.
- **`CellSize` carries its own `label` and `step`.** `label` is an exhaustive `switch (this)`, like `CellShape.label`
  and `BackgroundPreset.label`, so a fourth Cell Size is a compile error. `SizePicker` held a hand-maintained
  `const Map` reached as `labels[size]!` until this landed, which is the **exact** shape
  [`app/lib/ui/theme/CLAUDE.md`](../ui/theme/CLAUDE.md) records as a past crash: the fix was applied to the other two enums and not to this
  one. `step` is `pixels + gap`, the pitch a renderer advances by, and it exists so that number is written once:
  `ExportGeometryService` and both Export repositories each spelled it out, and `RenderOptions` carried a `cellSize`
  getter that restated `pixels` under the name [ADR 0016](../../../docs/adr/0016-cell-size-is-a-named-choice-in-the-app-and-fixed-geometry-on-the-web.md) reserves for pixel geometry. That getter is gone.
- **`Color.fromARGB` and `Color.fromRGB` take named channels.** They took four and three positional `int`s, which is
  the case the argument convention names by its own rationale: transposing red and blue produces a valid `Color`
  and a wrong colour, with nothing to catch it.
- **`PaletteService.resolve({ palettes, storedKey })`** answers which Palette a stored setting names. It accepts a
  **key or a name**, which is the in-code half of the `paletteKey` / `paletteName` migration, and falls back to the
  first Palette rather than throwing: a Palette removed from [`shared/palettes.json`](../../../shared/palettes.json) degrades to the default
  instead of bricking the Viewer. It returns `null` only for an empty list, which is a broken asset rather than a
  missing setting, and is what `ViewerState.paletteFailure` exists to report. `ViewerNotifier` spelled this out
  inline before, so the background isolate could not reuse it.
- **`ExportGeometryService`** answers how large an Export is: `logicalSizeFor` (the SVG's own units) and
  `pngPixelSizeFor` (those units times `pngPixelRatio`, 3.0). The PNG repository used to compute this inline while
  the Export sheet's format tile advertised the constant string `2880×720`: a size no `CellSize` produces, against
  a renderer that emits 2061×267 at `normal`. The tile computes it now, from the same function the renderer uses.
- **`ContributionStatsService.compute(calendar)`** returns the full `ContributionStats`: current and longest streak,
  best day and its date, active days, weekly average, best month and its total. The web's `ContributionStats` shares
  exactly **two** of those eight (the two streaks) and adds a `totalContributions` the app keeps on the calendar
  rather than in its stats. The remaining six are an unbuilt half, not a decision. So is most of this one: `StatsPanel` reads
  `currentStreak` and `longestStreak` and nothing else, so six of the eight figures are computed and shown nowhere.
  They are in the glossary's definition of Contribution Stats, so they stay; they are just not wired up yet.
- **`bestMonth` is a month number, 1–12**, straight out of `DateTime.month`. It was called `bestMonthIndex`, which
  invited a zero-based read and an off-by-one against any month-name table. The field is `null` when no day in the
  calendar has a known Count above zero, and also (more often) the moment any *active* day has an unknown Count,
  because `compute` guards the whole month block on `!incomplete`. A month total assembled from a partial tool-tip
  pass is a lower bound, and naming a best month out of lower bounds is the lie `_totalFor` already refuses.
- **`StreakService.currentFor` owns the current streak, and it is the only copy.** `ContributionStatsService` and
  `HomeScreenWidgetPayload` both call it, so the Viewer and the Home Screen Widget cannot drift apart. And because
  the payload is pure, the widget's streak is the one thing about it a test can assert without a device. It takes
  `today` rather than reading the clock, which is what makes it testable at all: the rule had no test before,
  precisely because there was no way to say what day it was.
- **It anchors on the last day belonging to the calendar's Year, capped at today.** That is the whole fix for past
  Years. The Contribution Grid pads the days on either side of the Year with an unknown Count, so a walk back from
  `DateTime.now()` (or from the end of the padded day list) hit a zero immediately and returned **0** for every
  past Year. `StatsPanel` labels that figure `FINAL`, so a year that closed on a forty-day run read as `FINAL 0 day
  streak`. Days outside `calendar.year` are dropped before the walk begins.
- **Trailing days after the anchor are skipped, and the anchor day itself is skipped while it is inactive**:
  otherwise a streak would appear to break at midnight over a day that has not happened yet. The web's
  `computeContributionStats` makes the same allowance, keyed on the level rather than the count.

## `CellGeometryService`: one Cell, five renderers

The decision, including why the published Embed's corner moved and why Kotlin cannot be held to it, is
[ADR 0020](../../../docs/adr/0020-the-cell-geometry-is-the-apps-in-three-languages.md).

**`figureFor` is the one place a Cell Shape becomes a primitive.** It answers a `CellFigure`: `SquareFigure`,
`RoundedFigure(radius)`, `CircleFigure(radius)` or `PolygonFigure(vertices)`, in the cell's own coordinates, with
the centre at `cellSize / 2`. The three Dart renderers match on those four cases instead of on the five Cell
Shapes, so **a sixth Cell Shape needs no renderer change at all** unless it needs a primitive none of them draws.
It still needs a `label` arm on the enum, which is a compile error until you write it, and a `when` arm in Kotlin,
which is not.

It collapses two arms into one: a Circle and a Dot are both a circle at the cell's centre, differing only in
radius, and each renderer used to know that. Each also re-derived its own radius inline, which is how the
on-screen Cell and the two Exports came to be three copies of the same five-arm mapping.

`CellFigure` is a value object rather than a service return type because it says *what to draw*, not how: a
`RoundedFigure` is a `DecoratedBox` on screen, an `rx` attribute in the SVG and an `RRect` on the PNG canvas, and
none of those belongs in `domain/`. Kotlin still spells its own mapping, for the reason
[ADR 0020](../../../docs/adr/0020-the-cell-geometry-is-the-apps-in-three-languages.md) gives.

The maths a Cell Shape is drawn with lives here, not in whichever renderer needs it: `cornerRadiusFor`,
`dotRadiusFor` and `hexVerticesFor`. **No renderer calls them any more**: all three go through `figureFor`, which
is the only caller left outside the tests.

**It exists because the four copies had drifted.** The dot radius and the hex vertices agreed everywhere, but the
rounded corner did not: the exports and the Android widget scaled it with the Cell Size (`cell * 0.2`) while the
screen drew a fixed `2.0`. At the `large` Cell Size that is 2.8 against 2.0: you chose a look, exported it, and
the corners changed. The screen was the outlier, so the screen moved.

`ContribKitWidgetProvider.kt` is the fourth copy and cannot import Dart, so it stays a deliberate mirror. If a
constant here changes, that file changes in the same commit. And note the constants themselves do not cross:
Kotlin spells `0.2f`, `1.4f`, `10f` and `6` as literals, so a change here produces no compile error and no failing
test there. The pairing is prose and a code review.

**There is a fifth renderer, and it agrees now.** [`web/src/domain/services/svg-geometry.ts`](../../../web/src/domain/services/svg-geometry.ts) draws the same Cell for
the Embed and the browser preview, and it used to hold its own numbers: a corner radius fixed at `2.5` where this
service returns `cell * 0.2`, and a dot radius of `1.4 + level` unscaled where this one multiplies by
`cellSize / 10`. There was **no** Cell Size at which the corners agreed, and the dots agreed only at exactly 10
(which the web itself does not always use, since [`grid-presets.ts`](../../../web/src/ui/components/grid/grid-presets.ts) draws the hero at 13 and the customizer at 12).

It carries `CORNER_RADIUS_RATIO = 0.2`, `DOT_BASE_RADIUS = 1.4` and `DOT_REFERENCE_CELL_SIZE = 10` now, and its
`cornerRadiusFor` / `dotRadius` are this service's formulas in TypeScript. The published Embed's rounded corner
therefore moved from `2.5` to `2.0`: the visible cost of one rule instead of two, taken deliberately.

This does **not** contradict
[ADR 0016](../../../docs/adr/0016-cell-size-is-a-named-choice-in-the-app-and-fixed-geometry-on-the-web.md): that
decision is about Cell Size being a person's choice in the app and fixed pixel geometry on the web, and a ratio
applied to a fixed size is still a fixed number. The direction was the one this codebase had already chosen once:
the service exists because the screen drew a fixed `2.0` while the exports scaled, and they were unified **on the
ratio**.

## Gotchas

- **`Username` accepts consecutive hyphens; GitHub does not.** `a--b` constructs cleanly and then 404s upstream. The
  web's regex is loose in the same way, on purpose: a truthful "user not found" beats a misleading "invalid
  username" for any handle GitHub later starts allowing.
- **The app's length check is separate from its pattern.** `[a-zA-Z0-9-]*` is unbounded, so the explicit
  `trimmed.length > 39` guard is the only thing enforcing the limit. Deleting it as "already covered by the regex"
  would silently accept a 200-character handle. The web bounds the length inside the pattern instead.
- **Streaks read `day.isActive`, not `day.count > 0`.** They keyed on the Count until the Count could be unknown,
  which meant a day GitHub had coloured broke a run whenever its tool-tip failed to parse, and made the app
  disagree with the web, which has always keyed on the level.
- **`bestDayDate` and `bestMonth` are `null` for an empty or wholly inactive calendar.** They are two of the
  **five** optional fields: `bestDayCount`, `weeklyAverage` and `bestMonthContributions` are the others, and every
  one of the five is derived from Counts. A UI that force-unwraps any of them will crash on a brand-new account.
- **`bestDayDate` is nulled with `bestDayCount`, not separately.** The date used to survive the `incomplete` flag
  that nulls the count, so the stats said *the best day was 15 June, and we cannot tell you how many* (which is a
  claim about which day was best, made from counts that are known to be partial). The pair is one fact.
- `ContributionCalendar` and `ContributionWeek` each carry a private `_listEquals`, because Dart's `==` on `List` is
  identity. Any new entity holding a list needs the same treatment or its equality is quietly wrong. And Riverpod
  rebuilds hang off exactly that comparison.
