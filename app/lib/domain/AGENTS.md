# app/lib/domain

The business core, in pure Dart. Zero external dependencies: no Flutter, no Riverpod, no `dart:ui`. It is the other
half of a domain implemented twice: the TypeScript mirror is
[`web/src/domain/`](../../../web/src/domain/AGENTS.md), and the two are meant to stay diffable concept by concept
([ADR 0003](../../../docs/adr/0003-layered-domain-architecture-in-both-clients.md)).

## Layout

| Folder | Holds |
| --- | --- |
| `entities/` | `ContributionCalendar`, `ContributionWeek`, `ContributionDay` |
| `value_objects/` | every value object and closed set, `Embed`, `AppSettings` and `CalendarDate` included |
| `failures/` | the sealed `Failure` set |
| `repositories/` | the ports `infrastructure/` implements, the two Telemetry ports among them |
| `services/` | eight `abstract final class`es of static functions |

## Value objects

- **`Username`'s length check is separate from its pattern.** `[a-zA-Z0-9-]*` is unbounded, so the explicit
  `trimmed.length > 39` guard is the only thing enforcing the limit. Deleting it as "already covered by the regex"
  would silently accept a 200-character handle. The web bounds the length inside the pattern instead.
- **`Year.minYear` is 2005**, a product floor rather than GitHub's launch year, which is 2008. Do not "correct" it.
- **Nothing here reads the clock.** `Year(value, today:)` takes its upper bound from the day its caller passes, and
  `Year.current(today:)` is the Year that day falls in, so a test says which year it is; the edges read the clock
  through `clockProvider` ([`ui/di/`](../ui/di/AGENTS.md)). `ContributionGridService` takes an `int` year, which is
  how its tests reach 2028 and later.
- **A calendar day is a UTC date, and `CalendarDate` is the one way to make one**
  ([ADR 0032](../../../docs/adr/0032-a-calendar-day-is-a-utc-date-in-the-app.md)). `parse` and `tryParse` read a bare
  `YYYY-MM-DD` into `DateTime.utc` and refuse any other shape and any date the calendar does not have (`2024-02-30`),
  as the web's `IsoDate` does, rather than overflowing to the day after. `of(instant)` is the date an instant falls on,
  read from the instant's own year, month and day and converted to no zone, so `today` from the clock, which is
  local, is the person's day. A local `DateTime` is an instant: `today`, `cachedAt`, `resetAt`. A local and a UTC
  `DateTime` with the same fields are never `==`, even under `TZ=UTC`, so a day built the other way misses every
  `byDate` lookup and equals no other day.
- **`AppSettings` is everything the app remembers.** `SettingsRepository.load()` returns one with the Cell Shape, the
  Cell Size, the Background Preset, the theme and the Telemetry Consent already defaulted, and `year(today:)` is
  `lastYear ?? Year.current(today: today)`. `saveBackgroundPreset` takes the `BackgroundPreset`, as every other save
  takes its value object. It has no `==`, because nothing compares one.
- **`UsageEvent`'s names and property keys continue PostHog's history**, so renaming one splits that history in two.
  That is why the Tip events carry their `tipProduct` under the key `product`, the exception
  [`CODING_STANDARDS.md`](../../../CODING_STANDARDS.md) states to the glossary rule.
  [`usage_event_test.dart`](../../test/domain/value_objects/usage_event_test.dart) pins every constructor's wire
  name and properties, that every property value is a `String`, an `int` or a `bool`, and that `properties` is
  unmodifiable, which is why the five events without any are `static final` and not `const`.
- **`ExportFormat` has no web value object.** The web offers the same Export Formats from
  [`ui/components/export/export-formats.ts`](../../../web/src/ui/components/export/export-formats.ts), because there
  the choice never leaves the browser; here it crosses from a widget through a provider to a repository.
- **`ContributionLevel` is an enum here and a `0–4` union on the web.** Both are five bands in the same order; the
  representations differ because the languages do. Anything serialising a level has to pick a side explicitly.

## Entities, and where they differ from the web's

| | App | Web |
| --- | --- | --- |
| Calendar holds | `List<ContributionWeek>` | a flat `readonly ContributionDay[]` |
| Calendar carries | `Username`, `Year`, `totalContributions` | `Username`, `Year \| null` (`null` for a Rolling Window), `totalContributions` |
| `ContributionDay.count` | `int?` | `number \| null` |
| Total | `int?` | `number \| null` |

A day whose tool-tip carried no number, and a day the scrape never mentioned, both arrive with a `null` Count; the
Contribution Grid pads with `null` too, because a day outside the requested Year is not a day with no contributions
([ADR 0019](../../../docs/adr/0019-an-unknown-count-is-null-in-both-clients.md)).

## `ContactMessage` is the other half of a cross-language contract

`ContactMessage.maxNameLength`, `maxEmailLength`, `minBodyLength` and `maxBodyLength` are the same numbers
[`web/src/domain/value-objects/contact-message.ts`](../../../web/src/domain/value-objects/contact-message.ts) exports as
`MAX_CONTACT_NAME_LENGTH`, `MAX_CONTACT_EMAIL_LENGTH`, `MIN_CONTACT_BODY_LENGTH` and `MAX_CONTACT_BODY_LENGTH`.
They have to agree because the app posts to that server's own `/api/contact`, so a form here that accepts what the
server refuses is a round trip spent being told no. Nothing links the two languages, so the docs contract diffs
them with a regex over both, and **the shape of these declarations is load-bearing** exactly as `Embed`'s are.

**`ContactMessage.toString()` prints the domain of the address and nothing else**, so a log line, a test failure or
a report that prints one carries no name, address or message
([ADR 0030](../../../docs/adr/0030-contact-messages-leave-through-cloudflares-send-email-binding.md)).

## `Embed` is half of a cross-language contract

`Embed.origin`, `Embed.segment` and `Embed.extension` are the same three strings
[`web/src/domain/value-objects/embed.ts`](../../../web/src/domain/value-objects/embed.ts) declares as `EMBED_ORIGIN`, `EMBED_SEGMENT` and `EMBED_EXTENSION`, because
the Markdown Export writes a URL the web has to serve. Nothing links the two languages, so the docs contract diffs
them: it parses the `static const` values here with a regex and asserts the TypeScript contains each one verbatim.
The defaults are checked too: `defaultPaletteKey` must be `github`, and `defaultShape` must be **the first key in
[`shared/shapes.json`](../../../shared/shapes.json)**, which is what the web derives its own default from. Reordering
that file therefore moves the web's default and not this one, and the test is the only thing that will say so.

`Embed.urlFor` takes the `Username` whole and omits a Palette key or a Cell Shape equal to its default, and so does
the web's `buildEmbedUrl`.
Neither builds a Background. The **SVG endpoint** reads a `background` query parameter,
because an Embed URL a person writes by hand may carry one.

## Services

- **`ContributionLevelService.levelFor({ count, yearMax })`** maps a Count to a Contribution Level by ratio. **GitHub
  does not publish how it assigns levels; this matches observed behaviour and is a guess.** It is only ever a
  fallback: the parser reads `data-level` and this runs solely when that attribute is missing. The web has no
  equivalent, because it drops such a day and lets the grid backfill it. `levelOf({ storedIndex, count, yearMax })`
  is the one place that choice is made, for a scraped day and a cached one alike: the stored index clamped into the
  enum, else `levelFor` (the web's `clampLevel`), and `highestCount` is the one reading of a Year's highest Count.
- **`ContributionGridService.buildFor`** turns a flat list of Contribution Days into a lattice of whole
  Sunday-aligned weeks covering the requested Year, padding every date it was not given as a day with no Count, and
  `weeksFor` answers how many weeks that takes
  ([ADR 0023](../../../docs/adr/0023-the-app-grid-covers-the-year-in-53-or-54-weeks.md)). `daysPerWeek` is declared
  here and is 7. [ADR 0013](../../../docs/adr/0013-the-app-grid-is-always-53-by-7.md) is the superseded decision that
  fixed the lattice at 53, and is worth reading for why the lattice exists at all. A date is built with
  `DateTime.utc(year, month, day + n)` and never stepped by a `Duration`, and a UTC date has no 23- or 25-hour day, so
  the lattice is the same in every zone.
- **`CellSize.step`** is `pixels + gap`, the pitch a renderer advances by, written once: `ExportGeometryService` and
  the PNG and SVG Export repositories read it.
- **`ExportGeometryService`** answers how large an Export is: `logicalSizeFor` (the SVG's own units) and
  `pngPixelSizeFor` (those units times `pngPixelRatio`). The Export sheet's format tile asks the same function the
  PNG renderer sizes its canvas with.
- **`PaletteService.resolve({ palettes, storedKey })`** answers which Palette a stored setting names. It accepts a
  **key or a name**, which is the in-code half of the `paletteKey` / `paletteName` migration, and falls back to the
  first Palette rather than throwing: a Palette removed from [`shared/palettes.json`](../../../shared/palettes.json) degrades to the default
  instead of bricking the Viewer. It returns `null` only for an empty list, which is a broken asset rather than a
  missing setting, and is what `ViewerState.paletteFailure` exists to report. `ViewerNotifier` and
  `HomeScreenWidgetRefresh` both call it.
- **`DiagnosticReportService.warrants(failure)`** answers whether a `Failure` is a defect worth a Diagnostic Report
  or the world's doing: `NetworkFailure`, `UpstreamFailure`, `RateLimitedFailure`, `NotFoundFailure` and
  `DeliveryFailure` are the world's. It exists for the background isolate, which has no person to show a `FailureMessage` to; the foreground
  reports none of them, because a `Failure` the Viewer renders is handled.
- **`StreakService.currentFor`** anchors on the last day belonging to the calendar's Year, capped at today, and skips
  the anchor day when it is today and still inactive, so a Streak does not break at midnight over a day that has not
  happened yet. It reads `today` through `CalendarDate.of` and compares it with days that are UTC dates, so the
  device's zone moves nothing. `ContributionStatsService` and `HomeScreenWidgetPayload` both call it, so the Viewer
  and the Home Screen Widget cannot drift apart.

## `CellGeometryService`: one Cell, five renderers

The decision, including why the published Embed's corner moved and why Kotlin keeps a copy of its own, is
[ADR 0020](../../../docs/adr/0020-the-cell-geometry-is-the-apps-in-three-languages.md).

`figureFor` answers a `CellFigure` (`SquareFigure`, `RoundedFigure(radius)`, `CircleFigure(radius)` or
`PolygonFigure(vertices)`) in the cell's own coordinates, with the centre at `cellSize / 2`, and the three Dart
renderers match on those four cases. **A sixth Cell Shape needs an arm in `figureFor` and in the enum's `label`**,
which are compile errors until you write them, **and a `when` arm in Kotlin, which is not**:
`dart_kotlin_seam_test.dart` is what catches that one. A Circle and a Dot are both a circle at the cell's centre,
differing only in radius.

`ContribKitWidgetProvider.kt` is the fourth copy and cannot import Dart, so it stays a deliberate mirror. If a
constant here changes, that file changes in the same commit. The constants do not cross, so a change here produces
no compile error there; what it does produce is a **failing test**. The docs contract reads `cornerRadiusRatio`,
`dotBaseRadius`, `dotReferenceCellSize` and `hexVertexCount` out of this file and asserts the TypeScript constants
and the Kotlin literals match.

**There is a fifth renderer.** [`web/src/domain/services/svg-geometry.ts`](../../../web/src/domain/services/svg-geometry.ts)
draws the same Cell for the Embed and the browser preview from `CORNER_RADIUS_RATIO`, `DOT_BASE_RADIUS` and
`DOT_REFERENCE_CELL_SIZE`, and its `cornerRadiusFor` / `dotRadius` are this service's formulas in TypeScript.

## Gotchas

- **`bestDayDate` and `bestMonth` are `null` for an empty or wholly inactive calendar.** They are two of the
  **five** optional fields of `ContributionStats`: `bestDayCount`, `weeklyAverage` and `bestMonthContributions` are
  the others, and every one of the five is derived from Counts. A UI that force-unwraps any of them will crash on a
  brand-new account.
- **`bestMonth` is a month number, 1–12**, straight out of `DateTime.month`.
- **`RateLimitedFailure` carries `resetAt`, an instant, where the web's `RateLimited` carries `retryAfterSeconds`, a
  duration, on purpose.** The Viewer prints the time the limit ends, and a duration read at render time would move
  with every rebuild; the Worker forwards the wait as `Retry-After` in the request that learnt it, and an instant
  converted back would drift by the seconds in between
  ([`web/src/domain/AGENTS.md`](../../../web/src/domain/AGENTS.md)). `null` is no wait named, and `RetryAfter` reads
  both forms of the header into the instant.
- **`NotFoundFailure` cannot be built `const`**, because it carries a `Username` and `Username`'s factory validates;
  failures are built at runtime, so that is the price of the type surviving the boundary.
- **CI's UTC cannot tell `CalendarDate.of(instant)` from `instant.toUtc()`.** The two agree at offset zero and differ
  for a local instant late in the evening west of UTC or early in the morning east of it. Before touching
  `CalendarDate`, `StreakService` or anything that reads `today`, run `flutter test` from `app/` under
  `TZ=Europe/Madrid`, `TZ=America/Los_Angeles` and `TZ=Pacific/Kiritimati`: the result must not move.
