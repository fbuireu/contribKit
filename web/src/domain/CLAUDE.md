# web/src/domain

The business core, in pure TypeScript. No Astro, no Cloudflare, no `fetch`, no `node:*`. It is the half of the
project that is implemented twice: the Dart mirror is [`app/lib/domain/`](../../../app/lib/domain/CLAUDE.md), and
the two are meant to stay diffable concept by concept
([ADR 0003](../../../docs/adr/0003-layered-domain-architecture-in-both-clients.md)).

The vocabulary these types are named after is [`CONTEXT.md`](../../../CONTEXT.md), and it is prescriptive: an
identifier that says something an `_Avoid_` list names is the thing that is wrong.

## Invariants & rules

- **No package imports.** Only TypeScript stdlib types, plus the design-token JSON through `@shared` as *data*
  (`palettes.json` in [`palette.ts`](./value-objects/palette.ts), `shapes.json` in [`cell-shape.ts`](./value-objects/cell-shape.ts), `usernames.json` in [`username.ts`](./value-objects/username.ts)). `vitest` in the
  co-located `*.test.ts` files is the only other import in the folder, and it is the test's, not the layer's.
- **Functional style.** Factory functions returning readonly objects. No classes.
- **Two arguments means one destructured object**, the repo-wide convention the
  [application guide](../application/CLAUDE.md) states. `invalidInput` and `network` both take one; `notFound` and
  `parse` take a single positional argument because they have exactly one.
- **Only `Username` and `Year` are `_tag` carriers,** and only they validate on construction: a `parse*` returning
  `T | Failure` (or `null`), plus an `is*` guard that checks the `_tag`. The rest of `value-objects/` is total
  (`clampLevel` clamps, `paletteByKey` defaults, `isCellShape` is a set membership test), so there is nothing to
  fail and no tag to carry.
- **Never throw.** Errors are the `Failure` discriminated union, returned as values. Adding a kind is a compile
  error at every exhaustive site, which is the point
  ([ADR 0004](../../../docs/adr/0004-typed-failures-instead-of-thrown-exceptions.md)). `isFailure` is structural
  (an object whose `kind` is one of the five), so it does not depend on the constructors having been used.
- **Repositories are interfaces only.** `ContributionsRepository` lives here; every implementation lives in
  `infrastructure/`.
- **Never invent a Count.** An unknown Count is `null`, and `null` is not `0`. The one place that has to reconcile
  the two is `computeContributionStats`, and it refuses to guess: see the gotcha below before adding anything that
  sums.

## The four value objects, and how each fails

| Value object | Rule | On failure |
| --- | --- | --- |
| `Username` | trimmed, then `/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/`: 1–39 chars, no leading or trailing hyphen | `InvalidInput(username)` |
| `Year` | `null` / `''` / `undefined` → `null`, meaning the rolling latest year; otherwise an integer in `MIN_YEAR … currentYear` | `InvalidInput(year)` |
| `ContributionLevel` | `clampLevel` forces any number into `0–4` | never fails: it clamps, rounds, and answers `0` for `NaN` |
| `Palette` / `CellShape` | looked up by key; an unknown key falls back to `DEFAULT_PALETTE_KEY` (`github`) / `DEFAULT_CELL_SHAPE` (first in `shapes.json`) | never fails: it defaults |

`MIN_YEAR` is **2005**, which is a product floor, not GitHub's launch year. GitHub launched in 2008; four
documents once said 2005 and were wrong for a different reason. Do not "correct" the constant to 2008. The floor
is deliberate.

The clamp-and-default pair is why the SVG endpoint cannot 400 on a bad `palette` or `shape`: a README embed with a
typo should still render a calendar, not a plain-text error inside an `<img>`.

`parseYear` coerces with `Number`, not `Number.parseInt`. The difference is the whole point: `parseInt` truncates,
so `"2020abc"` used to read as 2020 and pass, and a query string nobody meant silently picked a year. `Number`
rejects it. It is still a coercion, not a format check: `" 2020 "`, `"0x7e4"` and `"2.02e3"` all resolve to 2020
and are accepted; only integrality and the `MIN_YEAR … currentYear` bounds are enforced, and the bounds are what
catch the odder coercions (`"2e3"` resolves to 2000, so it fails the floor rather than the format).

## The Embed contract lives in `embed.ts`

[`value-objects/embed.ts`](./value-objects/embed.ts) is the one spelling of what an Embed URL is: `EMBED_ROUTE` (the path the middleware
exempts from `Cross-Origin-Resource-Policy`), `EmbedParam` (the three query names), `DEFAULT_EMBED_QUERY`,
`EMBED_BACKGROUND_PATTERN`, and `buildEmbedUrl`, which omits any option equal to its default and joins the rest
with a single `&`.

Four files used to spell that contract independently: the route's Zod schema, the middleware's regex, and the
Customizer's snippet builder, which hand-wrote the separators. They drifted: every continuation line of the
snippet both ended with `&` and began with `&`, so the URL the Customizer showed carried `?palette=x&&shape=y`,
and the copy button copied a different string again: the bare URL, with the visitor's Palette and Cell Shape
dropped. Build an Embed URL through `buildEmbedUrl` or the same class of bug comes back; it is not a place to
interpolate by hand.

**This file has a Dart twin, and the docs contract diffs them.** [`app/lib/domain/value_objects/embed.dart`](../../../app/lib/domain/value_objects/embed.dart) holds
the same origin, segment and extension, because the app's Markdown Export writes an Embed URL the web has to serve.
The test reads the Dart with a regex and looks for the literal `const EMBED_ORIGIN = "…"` here, so **the shape of
these three declarations is load-bearing**: split one across two lines, or move it onto an object, and the contract
fails against code that is perfectly correct. It also asserts that both clients omit the *same* defaults: the
Palette `github`, and the Cell Shape that is **first in [`shared/shapes.json`](../../../shared/shapes.json)**, which is the second thing reordering
that file silently changes. The two do not diverge: neither builder emits a Background.
`buildEmbedUrl` used to accept one, and this line used to call that a deliberate divergence, but the Customizer
offers a Palette and a Cell Shape and nothing else, so no production caller ever passed it and the arm was
reachable only from its own test. The **route** still accepts `background`, validated by
`EMBED_BACKGROUND_PATTERN`, which is what an Embed URL written by hand may carry; the pattern is now tested
directly against what it must reject rather than through a builder that no longer emits it.

## Dates live in local time, both halves

`addDays` and `getWeekday` parse an ISO date at **local noon** (`new Date("YYYY-MM-DDT12:00:00")`), and `toIsoDate`
formats back out of the **local** calendar fields (`getFullYear` / `getMonth` / `getDate`). Both halves have to
stay local or the pair stops round-tripping.

It did not, until `toIsoDate` was `date.toISOString().slice(0, 10)`: UTC. The noon anchor only absorbs offsets
inside ±12 h, so at UTC+13 and UTC+14 the returned date fell a day behind and at UTC−12 a day ahead. Every date
`buildGridFromApi` walked was shifted, so every `map.get(date)` missed and the client rendered a **blank
calendar** (in New Zealand only while NZDT is in force, which is why nobody hit it in June). Under
`TZ=Pacific/Auckland` three `addDays` assertions failed; the streak test then failed too, because its own helper
formatted "today" through `toISOString`. Run the suite under `Pacific/Auckland`, `Pacific/Kiritimati` and
`Etc/GMT+12` before touching this module. The server never saw any of it: Workers run in UTC.

Anything new that turns a `Date` into an ISO string goes through `toIsoDate`. `toISOString().slice(0, 10)` in a
test helper reintroduces the same bug in the test rather than the code.

## Gotchas

- **`GRID_CELL_COUNT = WEEKS_PER_YEAR (53) × DAYS_PER_WEEK (7)`**, all three declared in [`services/dates.ts`](./services/dates.ts).
  `buildGridFromApi` walks those 371 days from the Sunday on or before January 1st, so the grid always starts
  between December 26th of the previous year and January 1st, and always ends between December 30th and January
  6th of the next. Days outside the requested year are simply absent from the map and emerge as
  `{ level: 0, count: null }`. **An absent day is not a zero day**: it is a day with an unknown Count that
  happens to render like an empty one.
- **`computeContributionStats().totalContributions` is `number | null`, and `null` means "not knowable".** It adds
  only known Counts, and the moment a day at level 1 or above has `count: null` it discards the sum entirely and
  returns `null`. A total that skipped unknown days would be a lower bound presented as a measurement. A level-0
  day with an unknown Count does **not** void it, because GitHub's level 0 is zero. **`statsWithScrapedTotal` is
  where that gets reconciled**: it computes the stats and then lets `ContributionCalendar.total` beat the sum.
  **Not because it is GitHub's own headline figure: nothing in this project reads that.** The scraper computes it
  itself, in `totalFor`, under the same refuse-to-guess rule. It wins because it is computed over exactly the
  `<td>`s GitHub returned, while the sum here runs over whatever grid the caller built: padded to 371 days, and
  for the Embed a rolling window rather than a Year. The parameter is named `scrapedTotal` for where it comes
  from, not for what it measures; the guide claimed it was a measurement beating an estimate, and that was never
  true of either side. It returns a **new** `ContributionStats` rather than assigning to
  the one it was handed; the fields are `readonly`, and this was the only mutation of a value in the layer. Both
  call sites (the server render in [`pages/index.astro`](../pages/index.astro) and the client refresh in [`ui/utils/page-init.ts`](../ui/utils/page-init.ts)) go
  through it rather than reassigning the field themselves, which is what they each used to do. `ui/` renders the `null` as the word `unknown` rather than a figure. It summed `count ?? 0` and printed the result as exact until that changed; do not put the
  `??` back.
- **`clampLevel` lives in [`value-objects/contribution-level.ts`](./value-objects/contribution-level.ts), not in `services/`.** It is a value-object
  constructor that happens to be total.
- **A `Palette` here is five colours, not six.** [`shared/palettes.json`](../../../shared/palettes.json) defines a sixth, `noneLight`, and this
  layer deliberately drops it when building `PaletteColors`, because an embedded SVG cannot know the viewer's
  theme ([ADR 0012](../../../docs/adr/0012-light-theme-palette-variant-is-app-only.md)). The app reads all six.
- **A shape needs two edits, not one.** `CELL_SHAPES` is built from `shared/shapes.json` *filtered through the
  hand-written `CellShape` union*, so a token added to the JSON alone is dropped everywhere: it never reaches the
  customizer, the endpoint or `renderCellShape`. Before that filter existed the JSON key was cast into the union,
  the endpoint accepted it, and `renderCellShape` looked up a renderer that was not there and threw inside an
  `<img>`. Add the member and its `SHAPE_MARKUP_RENDERERS` entry in the same change as the JSON; the order of the
  JSON still decides `DEFAULT_CELL_SHAPE`, so reordering it silently changes the default shape of every embed.
- **The domain emits SVG substrings.** `renderCellShape` returns markup and [`svg-geometry.ts`](./services/svg-geometry.ts) computes the
  geometry around it; the two renderers only compose the document. `attributes` is interpolated into
  the tag verbatim: nothing here escapes it, so a caller that passes attacker-controlled text owns that.
- **`calendarLayout` is the whole geometry, in one call, and it is the module's interface.** It chunks the days
  into Contribution Weeks, sizes the document, clamps every Contribution Level, and returns finished placements:
  `monthLabels`, `weekdayLabels` and `cells`, each already carrying its `x` and `y`. The pad, gutter and baseline
  constants, the per-shape radius table and the four point functions are **private to this file**: they were nine
  exported primitives, and both renderers therefore imported twelve symbols each and wrote the same thirty-line
  walk: the same dimensions destructure, the same label loops, the same `translate` group, a byte-identical
  close. Only the geometry had been shared; the composition had not. What each renderer keeps is its own string
  templates, which is the part that genuinely differs.
- **The Cell maths is the app's, in TypeScript**
  ([ADR 0020](../../../docs/adr/0020-the-cell-geometry-is-the-apps-in-three-languages.md))**.** `CORNER_RADIUS_RATIO` (0.2), `DOT_BASE_RADIUS` (1.4) and
  `DOT_REFERENCE_CELL_SIZE` (10) are the same three constants [`app/lib/domain/services/cell_geometry_service.dart`](../../../app/lib/domain/services/cell_geometry_service.dart)
  holds, and `ContribKitWidgetProvider.kt` mirrors as literals. `rounded` gets `cornerRadiusFor(size)`, `square`
  gets 0, and `circle` / `dot` / `hex` get `size / 2`. That is what makes a rect look like a circle if it is ever
  routed through the rect renderer. Read through `calendarLayout().radius`. This file held a fixed `2.5` and an
  unscaled dot radius until that was unified; the Embed's corner moved from 2.5 to 2.0 as a result. **Change a
  constant here and it changes in three languages**: Dart is the source, Kotlin cannot import either.
- **`dotRadius` overflows its own cell on purpose.** Level 0 is `DOT_BASE_RADIUS` (1.4) and every other level is
  `1.4 + level`, so level 4 is 5.4 against a default cell half-width of 5. It still fits the 12 px pitch that
  `SVG_DEFAULT_CELL_SIZE` (10) plus `SVG_DEFAULT_CELL_GAP` (2) gives, so dots never collide. Shrink the gap and
  they will.
- **`cellSize` in [`services/types.ts`](./services/types.ts) is pixel geometry, not the glossary's Cell Size.** Nothing ever assigns it:
  the field exists so `svgStringRenderer` can fall back to `SVG_DEFAULT_CELL_SIZE`, and the SVG endpoint exposes no
  size parameter. The three fixed geometries in [`ui/components/grid/grid-geometry.ts`](../ui/components/grid/grid-geometry.ts) carry their own `size`/`gap` and feed the
  browser grid, not this option. Named Cell Sizes are an app-only concept
  ([ADR 0016](../../../docs/adr/0016-cell-size-is-a-named-choice-in-the-app-and-fixed-geometry-on-the-web.md)).
- **The aggregate knows its own span: `year: Year | null`.** [`CONTEXT.md`](../../../CONTEXT.md) defines a Contribution Calendar as the
  days "for one Year", and the app's has always carried a `Year`. The web's did not, so the Year travelled beside
  the aggregate as a bare `number` through five signatures, unwrapped from the `Year` the repository was handed at
  the first domain call. `null` is not "missing": it is the **Rolling Window**, which now has a glossary entry,
  and it is the span the Embed asks for and the app has no concept of.
- **`svgStringRenderer` takes `days`, not the calendar.** It only ever read `calendar.days`, and demanding the
  aggregate forced the SVG route to mint one with a spread whose `totalContributions` described a different day
  set than its `days`. That object was internally inconsistent by construction and the type system was happy with
  it. The port takes what it uses, so the spread is gone.
- **Calendar Labels are web-only, on purpose.** `MONTH_LABELS`, `WEEKDAY_LABELS`, `monthLabelsFor` and the
  `showLabels` flag have no Dart counterpart, so an SVG exported from the phone is an unlabelled lattice while the
  embed this renderer serves is labelled. The surface is the reason, not the model: an embed is a wide image in a
  README, while the app's grid scrolls, its widget is four centimetres wide, and its Exports are sized as exactly
  the lattice ([ADR 0024](../../../docs/adr/0024-calendar-labels-are-a-web-only-surface.md)).
- **The port is `ContributionRepository.fetchCalendar`, the same words the app uses.** It was
  `ContributionsRepository.fetch`: plural where the app is singular, and named after the global HTTP function the
  implementation literally calls, which is not a word [`CONTEXT.md`](../../../CONTEXT.md) has. A reader diffing the two layers hit
  that first. `year: Year | null` stays, and the `null` is the **rolling window** the Embed needs and the app has
  no concept of, which is why the app's port takes a required `Year`.
- **`buildEmbedUrl` takes a `CellShape` and encodes the handle into the path.** `shape` was a bare `string`, so
  `buildEmbedUrl({ username, shape: "triangle" })` type-checked here and could not be written in Dart; and the
  path interpolated the username raw while Dart wrapped it in `Uri.encodeComponent`. Both now match the app.
- **`Color` is a value object, and `PaletteColors` is five of them.** The colours in [`shared/palettes.json`](../../../shared/palettes.json) used to
  reach an SVG `fill=` attribute as raw strings, so a malformed token was a caught, typed failure on the phone
  (`Color.fromHex` throws) and a silently broken embed on the web. `PALETTES` parses every colour at module load
  through `colorOrThrow`, so a bad token fails the build rather than the render, and the value comes apart with
  `.hex` at the three places that emit markup. That is the same discipline the app has always had.
- **`ContributionWeek` is named here too.** It is `readonly ContributionDay[]`, produced by `weeksOf`, where the
  app has a class wrapping a list. The shape differs because the web's grid is a flat array and the app's is a list
  of weeks; the **concept** is now spelled in both, which is what [`CONTEXT.md`](../../../CONTEXT.md) giving it its own entry asks for.
  `monthLabelsFor` used to take `ReadonlyArray<ReadonlyArray<{ date: string }>>`, a structural stand-in invented
  because the type did not exist.
- **The aggregate's field is `totalContributions`, and the endpoint's JSON key is still `total`.**
  [`CONTEXT.md`](../../../CONTEXT.md) rejects `total` for Total Contributions in as many words, and the entity carried it until this
  landed while the app's `ContributionCalendar` had always spelled it out. The **payload** keeps `total` because it
  is a published contract, the same reason the `cells` alias survives; the two are decoupled at the one line in
  `pages/api/contributions.ts` that serialises the field. The glossary guard cannot see this class of violation:
  adding `total` to the policed list would fire on `totalContributions` itself.
- **`totalContributionsFor(days)` owns the Total Contributions rule, and the scraper calls it.** An unknown Count
  on a day at level 1 or above voids the Total; a level-0 unknown does not, because GitHub's level 0 is the zero it
  means ([ADR 0019](../../../docs/adr/0019-an-unknown-count-is-null-in-both-clients.md)). The scraper used to carry
  its own `totalFor`, so the rule sat in **infrastructure** while `computeContributionStats` implemented it again
  here: one rule, two layers, nothing making them agree, which is the shape ADR 0011 warns about reproduced inside
  a single client. The app had the identical split and was moved in the same commit.
- **`computeContributionStats` returns three fields, not the glossary's five.** `totalContributions`,
  `currentStreak` and `longestStreak`. Best day, best month, weekly average and active days exist only in the
  app's `ContributionStats`. That is an unbuilt half, not a decision, so no ADR records it; widen it here when the
  web grows a stats surface that needs them.
- **The current streak is anchored inside the Year it was asked about, and the anchor is injected.** It walks
  backwards from the earlier of 31 December and `today`, steps past today itself while today is still at level 0
  so a streak is not broken at midnight by a day that has not happened yet, and stops at 1 January rather than
  running out into the leading padding.
  This used to have no Year at all. It anchored on `today` alone, so for a past Year the walk started on a
  trailing padding day synthesised from the following January, found level 0, and broke immediately: the web
  returned **0 for every past Year**, and only the rolling window on the landing page hid it. The app never had
  the defect, because `StreakService` filters to the Year before anchoring. `today` is a parameter rather than a
  clock read for the same reason `StreakService` takes one: with the clock inside, the test has to rebuild its
  expectation from the value it is testing and can never disagree with the code.
- **A `Username` stays a `Username` all the way out.** `ContributionCalendar.username` and the `NotFound` failure
  both carry the value object, not a `string`. They used to hold `username.value`, so the repository took a
  validated handle in and handed a bare string back, and `parseUsername` stopped being the choke point exactly
  where the guarantee had the furthest left to travel. `/api/contributions` unwraps it with `.value` when it
  serialises, which is where a value object is supposed to come apart.
- **`Username` accepts consecutive hyphens; GitHub does not.** `a--b` passes `parseUsername` and then 404s upstream.
  Tightening the pattern is not free (it would turn a truthful "user not found" into a misleading "invalid
  username" for any handle GitHub later starts allowing), so the rule is deliberately looser than GitHub's, and the
  app's Dart regex is looser in the same way.
- **`buildGridFromApi` covers the Year, which is 53 weeks or, twice this century, 54.** `weeksFor(year)` answers
  how many whole Sunday-aligned weeks the Year takes: a leap Year opening on a Saturday needs `6 + 366 = 372`
  cells and 53 x 7 is 371, so 2028 and 2056 take a 54th week. `GRID_CELL_COUNT` is now only the **rolling**
  window's size, which is genuinely fixed because it has no Year to cover. `chunkWeeks` slices whatever it is
  handed instead of padding to 53, and `calendarLayout` takes its width from `weeks.length`
  ([ADR 0023](../../../docs/adr/0023-the-app-grid-covers-the-year-in-53-or-54-weeks.md)).
- **`buildRollingGrid` is the anchor-free sibling of `buildGridFromApi`.** It keys the days by date and ends on
  the Saturday of the latest day it was given, rather than on a calendar year, because the Embed deliberately
  shows a rolling window and never a pinned Year. Reach for it whenever days arrive without a Year to anchor on;
  never for `chunkWeeks` alone, which trusts its input to already be a date-ordered lattice.
- `chunkWeeks` slices whatever it is given into sevens and returns as many weeks as that takes. It used to pad to
  `WEEKS_PER_YEAR` unconditionally, which stopped being honest once a Year could need 54; a short input now leaves no trailing
  weeks empty rather than shortening the result, which is why the month-label pass inside `calendarLayout` guards
  on an empty week. Neither renderer calls `chunkWeeks` any more; the layout does.
- `MONTH_LABELS` is built once from `Intl.DateTimeFormat("en", …)` against year 2024, which is arbitrary and only there
  to name months. A month is labelled at the first week whose first day falls in that month's first seven days,
  which yields exactly twelve distinct labels for every year from 2005 to 2030. The December spill at both ends
  never earns a thirteenth. `WEEKDAY_LABELS` is `["Mon", "Wed", "Fri"]`: three labels for seven rows, drawn on alternate rows.
