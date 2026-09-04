# web/src/ui

The presentation layer: Astro components, the client-side controller, shared browser utilities and global styles.
It never imports `infrastructure/` or `pages/`: data arrives as props from a page, or over `fetch` from
`/api/contributions`.

**Today it imports `domain/` and nothing else.** Importing `application/` would be permitted by the dependency
direction, and no file does it: a use case needs a repository, and building one is `pages/`s job. If a component
ever needs `@application/*`, that is a signal the page should be passing the result down instead.

## Layout

| Directory | Contents |
|---|---|
| `components/` | Every Astro component, grouped by role. See [`components/CLAUDE.md`](./components/CLAUDE.md). |
| `utils/` | The browser-side half: `page-init` (the page controller), `state` + `render`, `roving` (keyboard navigation), `cookie` / `url` (username and year persistence), `cell-tooltip`, `contribution-errors`, `mulberry` (seeded PRNG), `app-links`, `unshuffle`. |
| `styles/` | Global CSS in `@layer` order: `index.css` is the entry, imported by `BaseLayout`. |

## Invariants & rules

- **Components are dumb.** Props in, markup out. No fetching, no domain logic. Client interactivity lives in
  [`utils/page-init.ts`](./utils/page-init.ts), not scattered through component `<script>` blocks.
- **CSS is colocated.** Each component imports its own `.css` from the same folder.
- **Palette colours and Cell Shapes always come from `@domain/value-objects/`.** Never a hex literal, never a shape
  name typed as a bare string.
- **Icons are inline SVG.** No icon font, no CDN: the CSP in [`web/src/middleware.ts`](../middleware.ts) would block one anyway.
- **`failure-http` is the only `Failure` → HTTP mapping,** and `isFailure` the only guard. Never redeclare either.
- **Every page goes through `BaseLayout`.**

## The client controller

`page-init.ts` is a module-scoped singleton, not a component. It owns the whole interactive page:

- **The markup contract is declared, in [`utils/dom-contract.ts`](./utils/dom-contract.ts).** `ElementId`, `ClassName` and `Selector` are the
  one spelling of every id and class that crosses the `.astro` ↔ `.ts` boundary, and **both sides use them**: the
  components interpolate (`id={ElementId.HeroGrid}`, `class={ClassName.BarTag}`) and the client reads through
  `Selector`. [`roving.ts`](./utils/roving.ts) writing `"active"` as a literal while [`render.ts`](./utils/render.ts) read it through `Selector` was the
  same one-way contract in miniature: renaming the constant would have changed the read and not the write. Twenty-nine literals used to cross
  the `.astro` ↔ `.ts` boundary with nothing tying them together, and every consumer is written as `if (el) …`, so
  renaming an id in a component silently turned a renderer into a no-op: the page kept working and simply stopped
  updating. Add a node the client touches, and add its id here in the same change. [`theme-toggle.ts`](./components/core/header/theme-toggle.ts) was the last
  file reaching past it with a literal `getElementById`, and [`Header.astro`](./components/core/header/Header.astro) spelled the same id back; both now go
  through `ElementId.ThemeToggle`. **The Playwright suite imports this file too**, by relative path: `tsconfig`
  includes `e2e/` and Playwright's transform resolves it. Three `Selector` entries existed whose only real consumer
  was the e2e, which spelled the same strings by hand; and the suite clicked `.theme-toggle`, a class the contract
  does not own, sitting beside the id it does. Dropping that redundant-looking class would have broken the e2e
  with nothing to explain why. Add a selector here and use it from both sides, tests included.
- **Adding a `Selector` entry adds an e2e obligation.** [`web/e2e/index.spec.ts`](../../e2e/index.spec.ts) walks the whole enum against the
  landing page and fails on any entry that matches nothing, because an entry no markup satisfies is a renamed id
  the `if (el)` consumers turn into a silent no-op. Two lists in that spec carve out the entries that only exist
  once the SVG tab is open, and there is **exactly one carve-out list**: `CODE_TAB_ONLY`. `PNG_TAB_ONLY`
  (`ExportPngPreview`) is the opposite kind of list: PNG is the default tab, so its entry must match on load and
  must then be *gone* once the SVG tab is clicked, which the spec asserts by expecting it to be unmatched. Putting
  a modal-only selector there does not exempt it from anything: it still lands in the on-load walk and fails
  there, before the tab click runs. Both lists are hand-maintained, so a selector that only exists behind a tab or
  a modal goes in `CODE_TAB_ONLY`, by hand, or the suite fails with nothing saying why.
- **Both getters guard, and neither always did.** `getActiveShape` reads a `data-key` from the DOM and goes
  through `isCellShape` before it is anything; `getActivePalette` goes through `paletteByKey`. The shape path
  carried its guard first and handed a bare `string` to three callers, each of which re-guarded or did not; the
  palette path had none at all, so a `data-key` naming a palette [`shared/palettes.json`](../../../shared/palettes.json) does not define threw a
  `TypeError` in three renderers instead of falling back. The long version is in the
  [components guide](./components/CLAUDE.md), which owns the renderers.
- **State is module-level, in [`state.ts`](./utils/state.ts)**: two variables, `days` and `username`, behind getters and setters.
  There is no store and no framework. Anything needing the current grid calls `getDays()`; anything changing it
  calls `setDays()` and then a `render*` function. Nothing subscribes, so **a mutation without a matching render
  is simply invisible**, which is the failure mode to watch for.
- **`flash` always restores the label `copy`,** so it belongs to the export copy button and nothing else. It also
  cancels its own pending timer through a module-level `WeakMap`, because a second click inside the 1500 ms window
  used to capture `copied!` as the label to restore: two timers raced, the button stuck on `copied!`, and a
  refused second copy settled there too, claiming a success that never happened. A second caller needs the label
  parameterised first.
- **`render.ts` re-reads state and rewrites the DOM**: `renderCustomize`, `renderExportPreview`, `renderWidget`,
  `updateHeroStats`, `updateYearRange`, `setHeroError`. They are idempotent by construction.
- **The initial grid comes from `window.__INITIAL_DAYS__`,** injected by the SSR page, falling back to
  `generateData()` when it is absent or empty; the page is never blank. **That read happens inside `initPage`,
  not at module scope.** It used to run on import, along with the first `setDays` / `setUsername`, so merely
  importing this module touched `window` and generated a grid. That is most of why the module with the real risk
  in it was barely asserted while `roving.ts` and [`url.ts`](./utils/url.ts), both trivially correct, had more test than
  implementation. **That imbalance is closed**: the four initialisers `initPage` composes are covered as well as
  the refresh — the username strip's empty-submission refusal and its lowercasing, the suggestion buttons, the
  `popstate` restore, and the URL rewrite `initUsernameState` performs when the address and the server-rendered
  field disagree. The one worth naming is the cookie: [`page-init.test.ts`](./utils/page-init.test.ts) doubles
  [`cookie.ts`](./utils/cookie.ts) and asserts `writeUsernameCookie` is reached on the success branch and on
  neither failure branch, which is the gotcha below stated as a test rather than as a paragraph.
- **`renderFromGitHub` takes its `request`,** defaulting to `fetch`. That one optional parameter is the seam the
  whole refresh is tested through: the year clamp, the grid build, the recognised-status sentence, the unreachable
  server, and the render button being re-enabled either way. Nothing else about it changed: the default is what
  every event handler in this file uses.
- **The client and the server build the same grid.** `page-init` calls `buildGridFromApi` and
  `statsWithScrapedTotal` from the domain layer, exactly as [`index.astro`](../pages/index.astro) does: the wrapper, not the
  `computeContributionStats` underneath it, because letting a scraped total beat the computed sum is the domain's
  decision and not a caller's. Neither reimplements the other.
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
level-0 day with no Count is not unknown (GitHub's level 0 *is* zero), so it does not poison the total. The
scraper produces exactly this state whenever its tool-tip pass finds nothing, and before the `null` existed the
hero answered a year of unmeasured activity with "0 contributions".

`showErrorState` passes `totalContributions: null` for the same reason: an error state must not leave a number on
screen, and zero is a number.

## `contribution-errors.ts`

The status → human sentence map, in lowercase, prefixed with `↳` by `formatHeroError` at render time.

| Status | Message |
| --- | --- |
| 400 | `invalid username` |
| 404 | `user not found, check the username and try again` |
| 429 | `too many requests, try again in a moment` |
| 502 | `could not reach github, try again in a moment` |
| anything else | `something went wrong` |

**The 429 wording is deliberately neutral, because the status has two sources.** On `/api/contributions` it is
either this site's own per-IP limit (the middleware, with `Retry-After: 60`) or GitHub rate-limiting the Worker
(a `RateLimited` failure, without one). This table is keyed on status alone, so a sentence naming GitHub would be
wrong half the time: the same class of mistake as the 502 that said "could not reach github" about a service
that had answered. Naming the cause needs the `kind` on the wire, which the JSON body does not carry yet.

These mirror `failure-http`'s status choices. **Adding a `Failure` kind that maps to a new status means adding a row
here too**, or users get the fallback sentence, and nothing fails to compile when you forget.

`contributionError({ status, serverMessage })` is the only way to read that table. A status in it wins; otherwise the
endpoint's own `error` field is used if there is one, and the fallback sentence last. That precedence used to live in
`page-init.ts`, which imported the map and the fallback constant raw and re-implemented the lookup, while
`index.astro` called the function: one policy, spelled two ways, in two files. The map and the fallback are no
longer exported.

## `roving.ts`

`initRovingGroup` wires a radio group or a tab list: click and `ArrowLeft`/`ArrowRight` (plus the vertical arrows
when the orientation is `Both`), `Home`, `End`, wrapping at both ends. It also owns the **roving tabindex** the
pattern is named after: `activateRadio` and `activateTab` set `tabIndex` to `0` on the target and `-1` on
everything else, and `initRovingGroup` seeds that from whichever element already carries `.active`. Without it every
swatch and every tab sat in the tab order, so reaching the content past the palette list took eleven tab presses.
The ARIA state (`aria-checked` / `aria-selected`) and the `.active` class are set in the same two functions; keep
them together, because the CSS and the screen reader must not disagree.

## Gotchas

- **`mulberry32` is a seeded PRNG, and the seeding is the point.** The placeholder grid has to come out identical on
  the server and on the client, or the page visibly reshuffles once the script runs. Never reach for `Math.random()`
  in anything that renders on both sides.
- **`generateData()` invents Counts.** It is the one sanctioned place, because the data is explicitly a placeholder
  for a visitor who has not asked for anyone. It must never be reachable for a real username: that is what
  `isExplicit` guards on the landing page.
- **`updateYearRange` reads `days[7]`, and that index is not arbitrary.** The grid starts on the Sunday on or before
  January 1st, so it is at most six days early and the eighth cell is always inside the requested year. It bails out
  below eight days rather than guessing.
- **The username cookie is written on success, not on submit.** `renderFromGitHub` used to call
  `writeUsernameCookie` before the request went out, so a format-valid typo (`torvalsd`) was persisted whatever
  came back. The SSR page reads that cookie on every visit, `resolveViewerIdentity` accepts it (it only checks the
  GitHub *format*), and the visitor got a blank grid plus "user not found" on every load for the cookie's full
  week. It is written next to `usernameDisplay.textContent`, on the branch where the answer is known.
- **The username cookie has two writers.** [`cookie.ts`](./utils/cookie.ts) prefers the Cookie Store API and falls back to
  `document.cookie` where it is missing: Safari and Firefox, where the whole feature was silently dead before,
  since the SSR page reads that cookie on every request. Biome's `noDocumentCookie` is turned off for that one file
  in [`biome.json`](../../biome.json); the fallback is the point, not an oversight.
- **`showErrorState` clears the numbers** rather than leaving the previous user's on screen. Stale numbers next to an
  error message read as real ones.
- **The `year` query is always sent now.** It is the select's value clamped to the current year, so the endpoint is
  never asked for the rolling window and the client and the server always describe the same span.
- **"Today" is not the same date on both sides.** `toIsoDate` reads local calendar fields, and the Worker's locale is
  UTC while the browser's is the visitor's, so the streak the SSR page computes and the one the client computes
  after a fetch can differ by a day for anyone whose offset has already crossed midnight. The client's answer is the
  correct one; do not "fix" it by forcing UTC, which is the bug the domain layer already had.
- **[`styles/global/variables.css`](./styles/global/variables.css) writes the dark palette twice, and the docs contract asserts the two are
  identical.** `:root:not(.theme-light)` is what an untouched browser gets from `prefers-color-scheme`;
  `:root.theme-dark` is what the toggle pins. They have to hold the same declarations in the same order, and the
  test compares them declaration for declaration. Add a variable to one and forget the other and a pinned dark
  theme silently loses it. The third block, `:root.theme-light`, is a different palette and is not checked.
- [`unshuffle.ts`](./utils/unshuffle.ts) de-obfuscates the contact details on the legal pages. It is anti-scraping decoration, not a security
  control. Treat anything it protects as public.
- **The three legal pages are pinned by [`web/e2e/legal-pages.spec.ts`](../../e2e/legal-pages.spec.ts)**, which asserts each answers 200, renders an
  `h1`, and carries `robots: noindex, nofollow`. It also asserts `/privacy` uses the `summary` Twitter card and has
  **no** `og:image`, because the social preview for a privacy policy is a link nobody should be enticed to share.
  **[`SEO.astro`](./components/core/seo/SEO.astro) defaults `robots` to `index, follow`**, and each of the three legal pages overrides it in its own
  `metadata`. So a fourth one left out of `LEGAL_PAGES` has nothing asserting its `noindex` and, if the override
  is also forgotten, ships **indexed** by inheriting that default. The failure is a present, wrong header rather
  than a missing one.
