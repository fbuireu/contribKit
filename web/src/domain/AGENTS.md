# web/src/domain

The business core, in pure TypeScript. No Astro, no Cloudflare, no `fetch`, no `node:*`. It is the half of the
project that is implemented twice: the Dart mirror is [`app/lib/domain/`](../../../app/lib/domain/AGENTS.md), and
the two are meant to stay diffable concept by concept
([ADR 0003](../../../docs/adr/0003-layered-domain-architecture-in-both-clients.md)).

The design-token JSON arrives through `@shared` as *data*: `palettes.json` in [`palette.ts`](./value-objects/palette.ts), `shapes.json` in
[`cell-shape.ts`](./value-objects/cell-shape.ts), `usernames.json` in [`username.ts`](./value-objects/username.ts). The ports, `ContributionRepository` and
`ContactMessageRepository`, both live in [`repositories/types.ts`](./repositories/types.ts); every implementation
lives in `infrastructure/`.

## The value objects, and how each fails

| Value object | Rule | On failure |
| --- | --- | --- |
| `ContactMessage` | every field trimmed; an empty name becomes `null`; the name is at most `MAX_CONTACT_NAME_LENGTH` characters; the email rule is strict (one `@`, a dot in the domain, no whitespace, no `<`, `>` or `"`, at most `MAX_CONTACT_EMAIL_LENGTH` characters); the body is `MIN_CONTACT_BODY_LENGTH`…`MAX_CONTACT_BODY_LENGTH` characters | `InvalidInput(name)` / `InvalidInput(email)` / `InvalidInput(message)` |
| `Username` | trimmed, then `/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/`: 1–39 chars, no leading or trailing hyphen | `InvalidInput(username)` |
| `Year` | `null` / `''` / `undefined` → `null`: no Year was given; otherwise an integer from `MIN_YEAR` to the `thisYear` the caller passes | `InvalidInput(year)` |
| `Color` | trimmed, then six or eight hex digits with or without a `#`, stored with the `#` | `InvalidInput(color)` |
| `IsoDate` | a zero-padded `YYYY-MM-DD` that names a real calendar date | `InvalidInput(date)` |
| `ContributionLevel` | `clampLevel` forces any number into `0–4` | never fails: it clamps, rounds, and answers `0` for `NaN` |
| `Palette` / `CellShape` | `paletteByKey` falls back to `DEFAULT_PALETTE_KEY` (`github`) for an unknown key; `isCellShape` guards a Cell Shape and the caller falls back to `DEFAULT_CELL_SHAPE` (the first key in `shapes.json` the union knows) | never fails: it defaults |

`MIN_YEAR` is **2005**, which is a product floor, not GitHub's launch year. GitHub launched in 2008. Do not
"correct" the constant to 2008. The floor is deliberate.

`parseYear` coerces with `Number`, not `Number.parseInt`, because `parseInt` truncates: `"2020abc"` would read as
2020 and pass, so a query string nobody meant would pick a Year. `Number` rejects it. It is still a coercion, not a
format check: `" 2020 "`, `"0x7e4"` and `"2.02e3"` all resolve to 2020 and are accepted; only integrality and the
`MIN_YEAR … thisYear` bounds are enforced, and the bounds are what catch the odder coercions (`"2e3"` resolves
to 2000, so it fails the floor rather than the format).

**Nothing here reads the clock.** `parseYear({ requested, thisYear })` takes the upper bound from its caller, and
`currentYear(thisYear)` is the Year of the number the caller read, so no `Year` after this one can be built and a
test says which year it is. The edges read the clock once: `/api/contributions` before `parseYear`, the landing page
before `loadInitial` and `statsWithScrapedTotalContributions`, and `page-init.ts` when it loads. `buildGridFromApi`, `weeksFor`,
`leadingDaysFor`, `computeContributionStats` and `statsWithScrapedTotalContributions` take the Year as a bare `number`, which is
how the tests reach 2028 and the Years after it. **`resolveYear` is the one reading of a requested Year**: a whole
number from `MIN_YEAR` to this year is that Year, and anything else answers this year. The landing page's server
render (through `loadInitialContributions`) and the client's `renderFromGitHub` and `readYearFromUrl` all call it,
which is what keeps the two renders on the same Year.

**`isCount` is the one reading of a Count's range**: a whole number from 0 to `Number.MAX_SAFE_INTEGER`. It sits
beside `contributionDay` in [`entities/contribution-day.ts`](./entities/contribution-day.ts), and the scraper's and
the browser's `countSchema` both refine with it, because the domain cannot import Zod. `contributionDay` keeps the
Count it is handed, so the range is checked where a Count arrives, before its day is built.

## `ContactMessage`: the per-field rules and the Dart twin

**The rules are exported one field at a time, and the parser is their composition.** `validateContactName`,
`validateContactEmail` and `validateContactBody` each answer an `InvalidInputFailure` or `null`, and
`parseContactMessage` runs them in that order before it trims and tags. They exist so the contact form can check a
single field when it is left, with the same sentence the server would answer. An empty required field gets its own
sentence ("Enter your email address", "Write a message") rather than the length rule's, because the two are
different mistakes to the person reading them and the same `field` to everything else. The MIME builder replaces CR
and LF in every header value as well, the second guard behind the email rule
([ADR 0030](../../../docs/adr/0030-contact-messages-leave-through-cloudflares-send-email-binding.md)).

**The limits have a Dart twin, and the docs contract diffs them.** `MAX_CONTACT_NAME_LENGTH`,
`MAX_CONTACT_EMAIL_LENGTH`, `MIN_CONTACT_BODY_LENGTH` and `MAX_CONTACT_BODY_LENGTH` are the same four numbers
[`app/lib/domain/value_objects/contact_message.dart`](../../../app/lib/domain/value_objects/contact_message.dart) declares as
`static const` ints, because the app posts to this project's own endpoint and a form that accepts what the server
refuses is a round trip spent on a rejection. The test reads both with a regex, so **the shape of these
declarations is load-bearing**, the same way the Embed contract's are. The web's `maxlength` attributes are
interpolated from these constants.

## The Embed contract lives in `embed.ts`

[`value-objects/embed.ts`](./value-objects/embed.ts) is the one spelling of what an Embed URL is: `EMBED_ROUTE` (the path the middleware
exempts from `Cross-Origin-Resource-Policy`), `EmbedParam` (the three query names), `DEFAULT_EMBED_QUERY`,
`EMBED_BACKGROUND_PATTERN`, and `buildEmbedUrl`, which takes the `Username` whole, omits any option equal to its
default, joins the rest with a single `&`, takes a `CellShape` and URL-encodes the Username's value into the path.

**This file has a Dart twin, and the docs contract diffs them.** [`app/lib/domain/value_objects/embed.dart`](../../../app/lib/domain/value_objects/embed.dart) holds
the same origin, segment and extension, because the app's Markdown Export writes an Embed URL the web has to serve.
The test reads the Dart with a regex and looks for the literal `const EMBED_ORIGIN = "…"` here, so **the shape of
these three declarations is load-bearing**: split one across two lines, or move it onto an object, and the contract
fails against code that is perfectly correct. It also asserts that both clients omit the *same* defaults: the
Palette `github`, and the Cell Shape that is **first in [`shared/shapes.json`](../../../shared/shapes.json)**, which the web derives and
the Dart spells as a literal, so reordering that file fails the contract until the two agree again. Neither builder
emits a Background. The **route** accepts `background`, validated by `EMBED_BACKGROUND_PATTERN`, which is what an
Embed URL written by hand may carry; `embed.test.ts` tests the pattern against what it must reject.

## One timeout for every request

[`value-objects/request-timeout.ts`](./value-objects/request-timeout.ts) holds `REQUEST_TIMEOUT_MS`, the 20 seconds
the scraper, the contact form and the calendar request each pass to `AbortSignal.timeout`. It lives here because
`ui/` may import nothing but this layer. The app's `RequestTimeout.duration` is its twin, and the docs contract fails
when the two numbers differ or when a `fetch` in `web/src` passes another signal.

## Dates live in local time, both halves

`addDays` and `getWeekday` parse an ISO date at **local noon** (`new Date("YYYY-MM-DDT12:00:00")`), and `toIsoDate`
formats back out of the **local** calendar fields (`getFullYear` / `getMonth` / `getDate`). Both halves have to
stay local or the pair stops round-tripping. `toIsoDate` is `isoDateOf` from [`iso-date.ts`](./value-objects/iso-date.ts), under the name
every caller outside this folder uses.

A UTC half breaks only in a browser. The noon anchor absorbs offsets inside ±12 h, so at UTC+13 and UTC+14 a
`toISOString()` date falls a day behind and at UTC−12 a day ahead, every `map.get(date)` in the grid misses, and
the calendar renders blank. Workers run in UTC and never show it. Before touching this module, run the suite from
`web/` in all three zones: `TZ=Pacific/Auckland pnpm vitest run src/domain`, then the same with
`Pacific/Kiritimati` and with `Etc/GMT+12`.

## Gotchas

- **`buildGridFromApi` walks `weeksFor(year) × DAYS_PER_WEEK` days from the Sunday on or before 1 January**, so the
  grid starts between 26 December and 1 January and ends on the Saturday between 31 December and 6 January; a leap
  Year opening on a Saturday needs `6 + 366 = 372` cells, which is why 2028, 2056 and 2084 take 54 weeks
  ([ADR 0023](../../../docs/adr/0023-the-app-grid-covers-the-year-in-53-or-54-weeks.md)). Every date it was not
  given emerges from `emptyDay` as `{ level: 0, count: null }`: **an absent day is not a zero day**, it is a day with
  an unknown Count that happens to render like an empty one.
- **`GRID_CELL_COUNT = ROLLING_WINDOW_WEEKS (53) × DAYS_PER_WEEK (7)` is the Rolling Window's size**, every one of them
  declared in [`services/dates.ts`](./services/dates.ts). `ROLLING_WINDOW_WEEKS` is the Rolling Window's width and not a
  Year's week count, which only `weeksFor` answers. `buildRollingGrid` is the anchor-free sibling of `buildGridFromApi`:
  it keys the days by date and ends on the Saturday of the latest day it was given, because the Embed shows a Rolling
  Window and never a pinned Year. `chunkWeeks` slices whatever it is given into sevens, the last week short if the days
  run out, and `calendarLayout` calls it through `weeksOf`.
- **`statsWithScrapedTotalContributions` is where the stats meet the calendar's own figure**: it computes the stats and
  then lets the calendar's `totalContributions`, passed as `scrapedTotalContributions`, beat the computed one unless it
  is `null`. The scraper computes that figure with `totalContributionsFor` too, over exactly the days GitHub returned,
  while the stats run over the days the caller hands them. Both call sites (the server render in
  [`pages/index.astro`](../pages/index.astro) and the client refresh in
  [`ui/utils/page-init.ts`](../ui/utils/page-init.ts)) go through it.
- **A shape needs two edits, not one.** `CELL_SHAPES` is built from `shared/shapes.json` *filtered through the
  hand-written `CellShape` union*, so a token added to the JSON alone is dropped everywhere: it never reaches the
  Customizer, the endpoint or `renderCellShape`. Add the `CellShape` member in the same change as the JSON; the
  compiler then asks for its arm in every exhaustive map and `switch` over the union: `SHAPE_MARKUP_RENDERERS` and
  `radiusFor` here, `CELL_LINE_RENDERERS` in `code-preview.ts` and `SHAPE_PREVIEWS` in `render-svg.ts`. The order
  of the JSON decides `DEFAULT_CELL_SHAPE`, the default shape of every Embed, and the docs contract fails until the
  Dart `Embed.defaultShape` agrees.
- **The domain emits SVG substrings.** `renderCellShape` returns markup and [`svg-geometry.ts`](./services/svg-geometry.ts) computes the
  geometry around it; the two renderers (`svgStringRenderer` and the UI's `renderCalendarString`) only compose the
  document. `calendarLayout` chunks the days into Contribution Weeks, sizes the document, and returns finished
  placements (`monthLabels`, `weekdayLabels` and `cells`, each carrying its `x` and `y`) beside the `size` and
  `radius` to draw with; it does not clamp levels, because `contributionDay` already did. The pad, gutter and
  baseline constants and the per-shape radius table are **private to this file**. `hexPoints` and `dotRadius` are
  exported for `renderCellShape`, and `cornerRadiusFor` for the code preview.
- **The Cell maths is the app's, in TypeScript**
  ([ADR 0020](../../../docs/adr/0020-the-cell-geometry-is-the-apps-in-three-languages.md))**.** `CORNER_RADIUS_RATIO` (0.2), `DOT_BASE_RADIUS` (1.4) and
  `DOT_REFERENCE_CELL_SIZE` (10) are the same three constants [`app/lib/domain/services/cell_geometry_service.dart`](../../../app/lib/domain/services/cell_geometry_service.dart)
  holds, and `ContribKitWidgetProvider.kt` mirrors as literals. `rounded` gets `cornerRadiusFor(size)`, `square`
  gets 0, and `circle` / `dot` / `hex` get `size / 2`. The rect shapes read it through `calendarLayout().radius`; the
  circle, dot and hex markup in `cell-shapes.ts` works its radius out from `size`, and the docs contract reads the
  circle's `size / 2` there. **Change a constant here and change it in every language the geometry is written in**:
  Dart is the source, Kotlin cannot import either, and the docs contract fails until they agree.
- **`dotRadius` overflows its own cell on purpose.** Level 0 is `DOT_BASE_RADIUS` (1.4) and every other level is
  `1.4 + level`, so level 4 is 5.4 against a default cell half-width of 5. It still fits the 12 px pitch that
  `SVG_DEFAULT_CELL_SIZE` (10) plus `SVG_DEFAULT_CELL_GAP` (2) gives, so dots never collide. Shrink the gap and
  they will.
- **`cellSize` in [`services/types.ts`](./services/types.ts) is pixel geometry, not the glossary's Cell Size.** Nothing assigns it, or
  `cellGap`: `svgStringRenderer` hands both to `calendarLayout` undefined, so its defaults
  (`SVG_DEFAULT_CELL_SIZE`, `SVG_DEFAULT_CELL_GAP`) apply, and the SVG endpoint exposes no size parameter. The
  three fixed geometries in [`ui/components/grid/grid-geometry.ts`](../ui/components/grid/grid-geometry.ts) carry their own `size`/`gap` and feed the
  browser grid, not this option
  ([ADR 0016](../../../docs/adr/0016-cell-size-is-a-named-choice-in-the-app-and-fixed-geometry-on-the-web.md)).
- **`IsoDate` is a branded string, and `date` is one.** It keys `byDate`, orders with `<` and `>`, is templated by
  `addDays` and sliced by `monthOf` and `dayOfMonthOf`, and each of those is correct only for a zero-padded
  `YYYY-MM-DD`. `parseIsoDate` rejects `2024-6-15`, a full timestamp and `20240615`, the shapes that miss a map
  lookup in silence, and it rejects a date that looks right and does not exist, like `2023-02-30`. Because the brand
  is a `string` at runtime, ordering and map keys work untouched, and `isIsoDate` checks the shape rather than a
  tag.
- **`InvalidInput` carries a `field`, and the JSON answers name it.** `fieldFor` spreads it into the body of
  `/api/contributions` and `/api/contact`, and the contact form reads it back to mark the field. The SVG route
  stays `text/plain`, because an `<img>` cannot read a field name.
- **A `Failure`'s `kind` is published.** `/api/contributions` answers every `Failure` with its `kind` beside the
  `error` text, and the landing page words its sentence from it, so renaming a kind breaks a client that reads the
  API ([ADR 0004](../../../docs/adr/0004-typed-failures-instead-of-thrown-exceptions.md)). `isFailureKind` is the
  guard a reader of that field checks it with.
- **The rate limit's wait is spelled differently in the two clients, on purpose.** The web's `RateLimited` carries
  `retryAfterSeconds`, a duration, because the Worker forwards it as `Retry-After` in the request that learnt it, and
  an instant converted back would drift by the seconds in between; the app's `RateLimitedFailure` carries `resetAt`,
  an instant, because the Viewer prints the time the limit ends, and a duration read at render time would move with
  every rebuild. Each is `null` when GitHub named no wait, and `0` is an answer
  ([`app/lib/domain/AGENTS.md`](../../../app/lib/domain/AGENTS.md)).
- **The aggregate knows its own span: `year: Year | null`.** `null` is not "missing": it is the **Rolling Window**,
  the span the Embed asks for. The app's `ContributionRepository.fetchCalendar` takes a required `Year`, because the
  app has no Rolling Window.
- **The current streak is anchored inside the Year it was asked about.** It walks backwards from the earlier of 31
  December and `today`, steps past today itself while today is still at level 0, so a streak is not broken by a day
  still under way, and stops at 1 January rather than running out into the leading padding.
- **Calendar Labels are web-only, on purpose.** `MONTH_LABELS`, `WEEKDAY_LABELS`, `monthLabelsFor` and the
  `showLabels` flag have no Dart counterpart, so an SVG exported from the phone is an unlabelled lattice while the
  embed this renderer serves is labelled. The surface is the reason, not the model: an embed is a wide image in a
  README, while the app's grid scrolls, its Home Screen Widget is four centimetres wide, and its Exports are sized as
  exactly the lattice ([ADR 0024](../../../docs/adr/0024-calendar-labels-are-a-web-only-surface.md)).
- `MONTH_LABELS` is built once from `Intl.DateTimeFormat("en", …)` against year 2024, which is arbitrary and only there
  to name months. A month is labelled at the first week whose first day falls in that month's first seven days,
  which yields exactly twelve labels for a Year's grid. A Rolling Window can open and close in the same month, and
  then that month is labelled at both ends, thirteen labels in all. `WEEKDAY_LABELS` is `["Mon", "Wed", "Fri"]`,
  drawn on alternate rows.
- **`Color` values are parsed at module load**: `PALETTES` runs every colour through `colorOrThrow`, so a bad token
  fails the build rather than the render, and a colour comes apart with `.hex` only where markup or a style is
  written. TypeScript cannot see a template literal in an `.astro` expression stringifying an object, which is why
  the home e2e asserts each palette swatch's style is a hex colour.
- **The aggregate's field is `totalContributions`, and the endpoint's JSON key is still `total`**, a published
  contract; the two are decoupled at the one line in `pages/api/contributions.ts` that serialises the field. The
  glossary guard does not police `total`: it would fire on that published key and on the code that carries it
  (`data.total` in `ui/utils/page-init.ts`, `scrapedTotalContributions` here).
