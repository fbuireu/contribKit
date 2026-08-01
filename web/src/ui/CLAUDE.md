# web/src/ui

The presentation layer: Astro components, the client-side controller, shared browser utilities and global styles.
It never imports `infrastructure/` or `pages/` — data arrives as props from a page, or over `fetch` from
`/api/contributions`.

**Today it imports `domain/` and nothing else.** Importing `application/` would be permitted by the dependency
direction, and no file does it: a use case needs a repository, and building one is `pages/`s job. If a component
ever needs `@application/*`, that is a signal the page should be passing the result down instead.

## Layout

| Directory | Contents |
|---|---|
| `components/` | Every Astro component, grouped by role. See [`components/CLAUDE.md`](./components/CLAUDE.md). |
| `utils/` | The browser-side half: `page-init` (the page controller), `state` + `render`, `roving` (keyboard navigation), `cookie` / `url` (username and year persistence), `cell-tooltip`, `contribution-errors`, `mulberry` (seeded PRNG), `css`, `app-links`, `unshuffle`. |
| `styles/` | Global CSS in `@layer` order — `index.css` is the entry, imported by `BaseLayout`. |

## Invariants & rules

- **Components are dumb.** Props in, markup out. No fetching, no domain logic. Client interactivity lives in
  `utils/page-init.ts`, not scattered through component `<script>` blocks.
- **CSS is colocated.** Each component imports its own `.css` from the same folder.
- **Palette colours and Cell Shapes always come from `@domain/value-objects/`.** Never a hex literal, never a shape
  name typed as a bare string.
- **Icons are inline SVG.** No icon font, no CDN — the CSP in `web/src/middleware.ts` would block one anyway.
- **`failure-http` is the only `Failure` → HTTP mapping,** and `isFailure` the only guard. Never redeclare either.
- **Every page goes through `BaseLayout`.**

## The client controller

`page-init.ts` is a module-scoped singleton, not a component. It owns the whole interactive page:

- **State is module-level, in `state.ts`** — two variables, `days` and `username`, behind getters and setters.
  There is no store and no framework. Anything needing the current grid calls `getDays()`; anything changing it
  calls `setDays()` and then a `render*` function. Nothing subscribes, so **a mutation without a matching render
  is simply invisible**, which is the failure mode to watch for.
- **`render.ts` re-reads state and rewrites the DOM**: `renderCustomize`, `renderExportPreview`, `renderWidget`,
  `updateHeroStats`, `updateYearRange`, `setHeroError`. They are idempotent by construction.
- **The initial grid comes from `window.__INITIAL_DAYS__`,** injected by the SSR page, falling back to
  `generateData()` when it is absent or empty — so the page is never blank.
- **The client and the server build the same grid.** `page-init` calls `buildGridFromApi` and
  `computeContributionStats` from the domain layer, exactly as `index.astro` does. Neither reimplements the other.
- **The year is decided once, before the request, and reused for the grid.** `renderFromGitHub` reads the select,
  clamps it to the current year and sends that as `&year=`, then builds the grid for the same number. It used to
  infer the year back out of `days[0].date`, which only agreed with the request because the select always has a
  value: strip the select and the endpoint answers with GitHub's rolling twelve months, whose first date is *last*
  year, and the grid would have been built a year off.

## Counts, totals, and the number in the hero

`updateHeroStats` prints `formatTotalContributions(stats.totalContributions)`, and that function is the only place
allowed to turn the total into text. A `null` total renders as **`unknown`**, never as `0`.

`computeContributionStats` returns `null` whenever a day at level 1 or above has no Count, because a sum that skips
unknown days is a lower bound and printing it with `toLocaleString()` would present a guess as a measurement. A
level-0 day with no Count is not unknown — GitHub's level 0 *is* zero — so it does not poison the total. The
scraper produces exactly this state whenever its tool-tip pass finds nothing, and before the `null` existed the
hero answered a year of unmeasured activity with "0 contributions".

`showErrorState` passes `totalContributions: null` for the same reason: an error state must not leave a number on
screen, and zero is a number.

## `contribution-errors.ts`

The status → human sentence map, in lowercase, prefixed with `↳` by `formatHeroError` at render time.

| Status | Message |
| --- | --- |
| 400 | `invalid username` |
| 404 | `user not found — check the username and try again` |
| 502 | `could not reach github, try again in a moment` |
| anything else | `something went wrong` |

These mirror `failure-http`'s status choices. **Adding a `Failure` kind that maps to a new status means adding a row
here too**, or users get the fallback sentence — and nothing fails to compile when you forget.

## `roving.ts`

`initRovingGroup` wires a radio group or a tab list: click and `ArrowLeft`/`ArrowRight` (plus the vertical arrows
when the orientation is `Both`), `Home`, `End`, wrapping at both ends. It also owns the **roving tabindex** the
pattern is named after — `activateRadio` and `activateTab` set `tabIndex` to `0` on the target and `-1` on
everything else, and `initRovingGroup` seeds that from whichever element already carries `.active`. Without it every
swatch and every tab sat in the tab order, so reaching the content past the palette list took eleven tab presses.
The ARIA state (`aria-checked` / `aria-selected`) and the `.active` class are set in the same two functions; keep
them together, because the CSS and the screen reader must not disagree.

## Gotchas

- **`mulberry32` is a seeded PRNG, and the seeding is the point.** The placeholder grid has to come out identical on
  the server and on the client, or the page visibly reshuffles once the script runs. Never reach for `Math.random()`
  in anything that renders on both sides.
- **`generateData()` invents Counts.** It is the one sanctioned place, because the data is explicitly a placeholder
  for a visitor who has not asked for anyone. It must never be reachable for a real username — that is what
  `isExplicit` guards on the landing page.
- **`updateYearRange` reads `days[7]`, and that index is not arbitrary.** The grid starts on the Sunday on or before
  January 1st, so it is at most six days early and the eighth cell is always inside the requested year. It bails out
  below eight days rather than guessing.
- **The username cookie has two writers.** `cookie.ts` prefers the Cookie Store API and falls back to
  `document.cookie` where it is missing — Safari and Firefox, where the whole feature was silently dead before,
  since the SSR page reads that cookie on every request. Biome's `noDocumentCookie` is turned off for that one file
  in `biome.json`; the fallback is the point, not an oversight.
- **`showErrorState` clears the numbers** rather than leaving the previous user's on screen. Stale numbers next to an
  error message read as real ones.
- **The `year` query is always sent now.** It is the select's value clamped to the current year, so the endpoint is
  never asked for the rolling window and the client and the server always describe the same span.
- **"Today" is not the same date on both sides.** `toIsoDate` reads local calendar fields, and the Worker's locale is
  UTC while the browser's is the visitor's — so the streak the SSR page computes and the one the client computes
  after a fetch can differ by a day for anyone whose offset has already crossed midnight. The client's answer is the
  correct one; do not "fix" it by forcing UTC, which is the bug the domain layer already had.
- `unshuffle.ts` de-obfuscates the contact details on the legal pages. It is anti-scraping decoration, not a security
  control — treat anything it protects as public.
