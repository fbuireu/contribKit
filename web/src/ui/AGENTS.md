# web/src/ui

The presentation layer: Astro components, the client-side controller, shared browser utilities and global styles.
It imports `domain/` and nothing else from the layers: data arrives as props from a page, or over `fetch` from
`/api/contributions` and `/api/contact`. A component that needs a use case is a signal the page should be passing the
result down instead.

## Layout

| Directory | Contents |
|---|---|
| `components/` | Every Astro component, grouped by role. See [`components/AGENTS.md`](./components/AGENTS.md). |
| `utils/` | The browser-side half: `page-init` (the page controller), `state` + `render`, `dom-contract` (the markup contract), `roving` (keyboard navigation), `cookie` / `url` (username and year persistence), `contributions-body` (the Zod shapes of what `/api/contributions` and the SSR page hand the client), `non-blank` (the trimmed, non-empty text check the cookie and `?user=` share), `cell-tooltip`, `contribution-errors`, `mulberry` (seeded PRNG), `app-links`, `unshuffle`. |
| `styles/` | Global CSS, one `@layer` per folder. `index.css` is the entry, imported by `BaseLayout`, and the order of its `@import` lines is the layer order (`reset`, `vendor`, `theme`, `animations`, `base`): no `@layer` statement declares it. Component stylesheets are unlayered (`@scope`), so they beat every layer here. |

The landing page's interactivity lives in [`utils/page-init.ts`](./utils/page-init.ts), one controller for the whole
page; a component that owns its own behaviour keeps a colocated controller beside it and one `<script>` that calls
it, the way [`header/theme-toggle.ts`](./components/core/header/theme-toggle.ts),
[`contact/contact-form.ts`](./components/contact/contact-form.ts) and
[`telemetry/telemetry.ts`](./components/core/telemetry/telemetry.ts) do. The two `is:inline` scripts that must act
before the bundle loads, the theme bootstrap in `BaseLayout.astro` and Google's consent default in
`Telemetry.astro`, are the only behaviour a component carries inline.

## What the browser reads from outside its bundle

The `/api/contributions` body and `window.__INITIAL_DAYS__` are read through the schemas in
[`contributions-body.ts`](./utils/contributions-body.ts) (`contributionCalendarSchema`,
`contributionCalendarErrorSchema`, `contributionGridSchema`), the `/api/contact` error body through
`contactMessageErrorSchema` in `contact-form.ts`, and the `ck_user` cookie and `?user=` through `nonBlank` in
[`non-blank.ts`](./utils/non-blank.ts); `?year=` goes through the domain's `resolveYear`, the rule the server render
applies to the same parameter. Nothing is cast: `__INITIAL_DAYS__` is declared `unknown` in
[`env.d.ts`](../env.d.ts), and `response.json()` lands in an `unknown`. Zod checks the shape, and a day still goes
through `contributionDay`, so the domain decides what a calendar date is and clamps the level, and one bad date drops
that day rather than the whole answer. A Count, a day's or the total, passes `countSchema`, which refines with the
domain's `isCount`, the same range the scraper's `countSchema` holds a scraped Count to. `schema.validate(value)`
narrows the value it was given untouched, so no `.catch`, `.default`, `.transform` or coercion reaches the caller: a
schema that needs one is read through `parse` or `safeParse`.

Zod comes from `astro/zod`, which re-exports classic Zod and does not tree-shake: these schemas cost 23.4 KB gzip on
`/` and on `/contact` ([ADR 0031](../../../docs/adr/0031-the-web-keeps-its-hand-written-failure-union-instead-of-effect.md)).
**The layout's own scripts stay Zod-free.** `theme-toggle`'s `localStorage` read and `usage-event-links`' attribute
read are membership tests over closed sets, and importing Zod there would put the chunk under `Header` and
`Telemetry`, on every page, the legal, 404 and 500 pages included. The two `is:inline` scripts in `BaseLayout.astro`
and `Telemetry.astro` cannot import at all.

## The client controller

`page-init.ts` is a module-scoped singleton, not a component. It owns the landing page's interactivity:

- **The markup contract is declared, in [`utils/dom-contract.ts`](./utils/dom-contract.ts).** `ElementId`, `ClassName` and `Selector` are the
  one spelling of the ids and classes that cross the `.astro` ↔ `.ts` boundary, and both sides read them. Every
  consumer is written as `if (el) …`, so an id renamed on one side turns a renderer into a silent no-op: the page
  keeps working and stops updating. **The Playwright suite imports this file too**, by relative path: `tsconfig`
  includes `e2e/` and Playwright's transform resolves it. `ExportCodePreview`, `ExportCopyButton` and
  `ExportPngPreview` have no reader in `src`: [`render.ts`](./utils/render.ts) writes those nodes through `ClassName`
  and only the tests read them, so they look dead and are not. `SiteSection`, the Usage Event's closed set, is built
  from the section ids, and `ThemeClass` holds the two classes the theme bootstrap and the toggle put on `<html>`, so
  Playwright reads them without importing `theme-toggle.ts`. [`dom-contract.test.ts`](./utils/dom-contract.test.ts)
  fails on a component that spells a declared id or class instead of interpolating it. **A stylesheet cannot import,
  so the CSS spells the same strings**: renaming an entry means editing the stylesheets that select it.
- **A page that is not the landing page adds ids and no `Selector`.** The contact form's ids
  (`ContactForm`, `ContactName`, `ContactEmail`, `ContactMessage`, `ContactWebsite`, `ContactSubmit`,
  `ContactStatus`, and the per-field `ContactNameError`, `ContactEmailError` and `ContactMessageError`) are in
  `ElementId` and deliberately **not** in `Selector`, because the rule below walks the whole
  `Selector` enum against `/` and every one of them would match nothing there. Its controller reads them through
  `ElementId` directly, and [`e2e/contact.spec.ts`](../../e2e/contact.spec.ts) walks every `ElementId` whose key
  starts with `Contact` against `/contact` instead, each matching exactly one node, before it asserts what is
  visible or hidden.
- **Adding a `Selector` entry adds an e2e obligation.** [`web/e2e/index.spec.ts`](../../e2e/index.spec.ts) walks the whole enum against the
  landing page and fails on any entry that matches nothing, because an entry no markup satisfies is a renamed id
  the `if (el)` consumers turn into a silent no-op. Two hand-maintained lists in that spec change the walk.
  `CODE_TAB_ONLY` is the one carve-out: its entries exist only once the SVG tab is open, so they skip the on-load
  walk and must match after the spec clicks that tab. `PNG_TAB_ONLY` (`ExportPngPreview`) is the opposite kind of
  list: PNG is the default tab, so its entry must match on load and must be *gone* once the SVG tab is clicked. A
  selector that exists only behind the SVG tab goes in `CODE_TAB_ONLY`; one behind a modal or another tab needs a
  list and a step of its own in the spec, or the suite fails with nothing saying why.
- **The `dataset` reads.** `getActiveShape` reads a `data-key` through `isCellShape` and `getActivePalette` through
  `paletteByKey`, so a key naming no Cell Shape or Palette falls back to the default. `getActiveExportTab` reads it
  through `isExportFormatKey` and answers `null` for a key naming no Export Format, which `renderExportPreview` draws
  as the default format and `initExportTabs` records as nothing. `cell-tooltip.ts` reads `data-date` through
  `isIsoDate`, so a Cell whose date is empty or names no calendar day still opens the Cell Tooltip and names its
  Count without a date (`5 contributions`), never `Invalid Date`, and reads `data-count` as a run of digits passed
  through the domain's `isCount`, so an empty, signed, fractional or non-numeric value is an unknown Count
  (`Contributions unknown`), never `NaN` or a truncated guess.
- **State is module-level, in [`state.ts`](./utils/state.ts)**: two variables, `days` and `username`, behind getters and
  setters. `days` is readonly in both directions, and `username` is the `Username` value object, or `null` until the
  page holds a valid one: an SSR input that names none (`?user=foo_bar`) leaves it `null`, and the renderers that need
  one (`renderExportPreview`, the Home Screen Widget's name) skip. There is no store and no framework. Anything needing
  the current grid calls `getDays()`; anything changing it calls `setDays()` and then a `render*` function. Nothing
  subscribes, so **a mutation without a matching render is simply invisible**, which is the failure mode to watch for.
  `renderCustomizer`, `renderExportPreview` and `renderHomeScreenWidget` re-read state; `updateHeroStats`,
  `updateHomeScreenWidgetStats`, `updateYearRange` and `setHeroError` write what they are handed.
- **`flash` always restores the label `copy`,** so it belongs to the export copy button and nothing else; a second
  caller needs the label parameterised first. It cancels its own pending timer through a module-level `WeakMap`,
  so a second click inside `COPIED_FEEDBACK_MS` can neither restore `copied!` as the label nor leave a refused copy
  claiming a success that never happened.
- **The initial grid comes from `window.__INITIAL_DAYS__`,** injected by the SSR page and read inside `initPage`,
  falling back to `generateData()` when it is absent, empty or not a list of Contribution Day shapes
  (`contributionGridSchema`), and dropping a day whose date is not on the calendar; the page is never blank.
  [`page-init.test.ts`](./utils/page-init.test.ts) doubles [`cookie.ts`](./utils/cookie.ts) and asserts
  `writeUsernameCookie` is reached on the success branch and on neither failure branch.
- **`renderFromGitHub` takes a `Username` whole, its `request`,** defaulting to `fetch` with
  `AbortSignal.timeout(REQUEST_TIMEOUT_MS)`, the seam the whole refresh is tested through, **and a `source`**, a `CalendarRequestSource` defaulting to `form`, because the DOM does not say what asked for the
  render: the form and the render button pass `form`, a suggestion button `suggestion`, the year select `year` and
  `popstate` `history`. The event is `calendar_rendered` with that source and the Year on success,
  `calendar_render_failed` with a reason `contributionFailureReason` derives from the error body, or `unreachable`
  from the catch; the username is never on it.
- **A body of the wrong shape is an error state, never a calendar.** A 200 whose body fails
  `contributionCalendarSchema` (no `days`, a Count or total that is not a non-negative integer or `null`, or no JSON
  at all) takes the branch a refused status takes: `showErrorState` with `something went wrong`,
  `calendar_render_failed` with reason `unknown`, and no cookie written. The body is read with `.catch(() => null)`,
  so `unreachable` means the request itself rejected: a 429 answered with an HTML page (the zone's bot rule answers
  one, see the root guide's Deploy section) gets the sentence its status maps to, and a 502 the fallback. An error
  body's `kind` and `field` choose the sentence, and its `error` reaches it only where neither the kind nor the status
  names one, all three only when `contributionCalendarErrorSchema` accepts the body.
- **The controllers record their Usage Events after the render.** `initRadioList` takes an `onChosen` beside its
  selector and calls it after `renderCustomizer`, so the palette and shape events read `getActivePalette().key` and
  `getActiveShape()`; `initExportTabs` records the tab only when `getActiveExportTab` names an Export Format. The
  copy button in [`render.ts`](./utils/render.ts) records `export_copied` after the clipboard settles. The names, the
  property shapes and the consent gate are in the [components guide](./components/AGENTS.md), under
  `core/telemetry/`.
- **A link that only needs to be counted declares it in the markup.** The Google Play anchors and the header's
  section links carry `data-usage-event` (with `data-usage-store` / `data-usage-placement` or `data-usage-section`),
  written through `usageEventAttributes` in the frontmatter and read by the one delegated listener
  `initUsageEventLinks` installs, which the `<script>` in `Telemetry.astro` calls. Only `store_link_opened` and
  `section_navigated` can be declared that way, and both sides check the values against the closed sets.
- **The client and the server build the same grid.** `page-init` calls `buildGridFromApi` and
  `statsWithScrapedTotalContributions` from the domain layer, exactly as [`index.astro`](../pages/index.astro) does.
- **The year is decided once, before the request, and reused for the grid.** `renderFromGitHub` reads the select
  through the domain's `resolveYear`, which `readYearFromUrl` applies to `?year=` and the landing page's server
  render applies too, so a value that names no Year (`2022.5`, `-1`, `1999`, next year) opens on the current one; it
  sends that as `&year=`, publishes it in the URL and builds the grid for the same number. The `year` query is
  therefore always sent, so the endpoint is never asked for the Rolling Window. **The current year is the UTC year,**
  `CURRENT_YEAR = new Date().getUTCFullYear()`, because the Worker's clock is UTC and its upper bound is the year it
  reads there: a visitor east of UTC in the first hours of 1 January, whose own calendar is a year ahead, must not ask
  for a year the Worker has not reached. [`page-init-year.test.ts`](./utils/page-init-year.test.ts) sets the zone to
  prove it, east and west.
- **Every path to the request refuses a malformed Username before it leaves.** The select's `change` event goes
  through the same `submitRender` the button and the form use: an empty field gets its own sentence, a malformed one
  `parseUsername`'s, with focus back on the input. `popstate` runs the `?user=` it restores through `parseUsername`
  too and shows the same sentence instead of fetching. The input's `maxlength` is `MAX_USERNAME_LENGTH`.

## Counts, totals, and the number in the hero

`computeContributionStats` gives a `null` total, through `totalContributionsFor`, whenever a day at level 1 or above
has no Count, and `updateHeroStats` prints it through `formatTotalContributions` as **`unknown`**. The scraper
produces exactly this state whenever its tool-tip pass finds nothing.

An error state has no figures at all. `ContributionStats` types the total and both Streaks `number | null`, and
`showErrorState` hands `updateHeroStats` the domain's `UNKNOWN_CONTRIBUTION_STATS`, every figure `null`, which
`formatTotalContributions` and `formatStreak` print as `unknown`; the landing page's server render takes the same
figures from `initialStatsFor` when an asked-for calendar did not load, so neither side prints a `0` it never
measured.

## `contribution-errors.ts`

The `Failure` kind → human sentence map, in lowercase, prefixed with `↳` by `formatHeroError` at render time.
`contributionError({ status, kind, field, serverMessage })` is the only way to read it. The error body's `kind`
picks the sentence when `isFailureKind` accepts it; an answer that names no kind falls back to the kind its status
names (400, 404, 429); a kind and a status that name none leave the endpoint's own `error` field if there is one,
and the fallback sentence last. The landing page's server render passes the `kind` `loadInitialContributions`
returned.

| Kind | Message |
| --- | --- |
| `NotFound` | `username not found, check it and try again` |
| `InvalidInput` | `invalid username`, or `invalid year` when its `field` is `year` |
| `Network` | `could not reach github, try again in a moment` |
| `Upstream` | `github could not serve the calendar, try again in a moment` |
| `Parse` | `github answered, but the contribution calendar could not be read` |
| `RateLimited` | `too many requests, try again in a moment` |
| `Delivery`, and anything else | `something went wrong` |

**Only a `Network` failure says it could not reach GitHub.** An `Upstream` or a `Parse` failure answers 502 as well,
and there GitHub did answer, and a 502 that names no kind (an HTML page the zone answered) gets the fallback, because nothing says
GitHub is why. **The 429 wording stays neutral**: a 429 with no kind is this site's own per-IP limit (the
middleware, with `Retry-After: 60`), and one with `RateLimited` is GitHub rate-limiting the Worker.

`CONTRIBUTION_ERRORS` and `CONTRIBUTION_FAILURE_REASONS` are each a `Record<Failure["kind"], …>`, so a new kind
fails to compile until it has a sentence and a reason. **The Usage Event's reason is read the way the sentence is**:
`contributionFailureReason({ status, kind, field })` takes the body's `kind` when `isFailureKind` accepts it and the
kind its status names otherwise. A rejected Year records `invalid_year` and a rejected Username `invalid_username`;
`Network`, `Upstream` and `Parse` record `upstream`, as an answer that names no kind does at 502; any other status
that names none records `unknown`, so no status code leaks as a free value.

## `roving.ts`

`initRovingGroup` wires a radio group or a tab list: click and `ArrowLeft`/`ArrowRight` (plus the vertical arrows
when the orientation is `Both`), `Home`, `End`, wrapping at both ends. It also owns the **roving tabindex** the
pattern is named after: `activateRadio` and `activateTab` set `tabIndex` to `0` on the target and `-1` on
everything else, and set the ARIA state (`aria-checked` / `aria-selected`) and the `.active` class, and
`initRovingGroup` seeds the tab stop from whichever element already carries `.active`, or the first one, so each
group is a single tab stop rather than one per swatch or tab.

## Gotchas

- **The versions the page prints are build-time constants.** `astro.config.ts` defines `__WEB_VERSION__`, read from
  `web/package.json`, and `__APP_VERSION__`, read from `app/pubspec.yaml`, in `vite.define`, and
  [`env.d.ts`](../env.d.ts) declares both: the footer prints the first and the hero the second. A component that
  imported a manifest would climb out of `web/src`, which the docs test rejects.
- **`mulberry32` is a seeded PRNG, and the seeding is the point.** The placeholder grid has to come out identical on
  the server and on the client, or the page visibly reshuffles once the script runs.
- **`updateYearRange` reads `days[7]`, and that index is not arbitrary.** The grid starts on the Sunday on or before
  January 1st, so it is at most six days early and the eighth cell is always inside the requested year. It bails out
  below eight days rather than guessing.
- **The username cookie is written on success, not on submit.** The SSR page reads it on every visit and
  `resolveViewerIdentity` checks only its GitHub *format*, so a well-formed typo (`torvalsd`) written on submit
  would greet the visitor with a blank grid and "username not found" on every load for the cookie's full week.
  `renderFromGitHub` writes it on the branch where the answer is known.
- **The username cookie has two writers.** [`cookie.ts`](./utils/cookie.ts) prefers the Cookie Store API and falls back to
  `document.cookie` where the API is missing, since the SSR page reads that cookie on every request. Biome's
  `noDocumentCookie` is turned off for that one file in [`biome.json`](../../biome.json); the fallback is the point, not an oversight.
- **A cookie value that is not valid percent-encoding reads as nobody.** `decodeURIComponent` throws a `URIError` on
  one; `cookie.ts` catches it and runs the value through `nonBlank` like the Cookie Store's, so `readUsernameCookie`
  answers `null` and `seedUsernameCookie` overwrites the value instead of rejecting.
- **"Today" is not the same date on both sides.** `toIsoDate` reads local calendar fields, and the Worker's locale is
  UTC while the browser's is the visitor's, so the streak the SSR page computes and the one the client computes
  after a fetch can differ by a day for anyone whose offset has already crossed midnight. The client's answer is the
  correct one; do not "fix" it by forcing UTC: `toIsoDate` and the parse at local noon round-trip only while both
  halves stay local.
- **[`styles/global/variables.css`](./styles/global/variables.css) writes the dark theme twice, and the docs contract asserts the two are
  identical.** `:root:not(.theme-light)` is what an untouched browser gets from `prefers-color-scheme`;
  `:root.theme-dark` is what the toggle pins. They have to hold the same declarations in the same order. The light
  palette is the plain `:root` block, and `:root.theme-light` only pins `color-scheme: light`; neither is checked.
  `--background` is written once more, as hex, in the two `theme-color` metas of `BaseLayout.astro`: change both.
  **No token is registered with `@property`**, and the docs contract rejects one: a registered property whose value
  is unset or invalid falls back to its `initial-value` rather than to the theme's, and a registered colour animates,
  so a theme switch would fade through intermediate colours instead of flipping.
- **The consent banner's own stylesheet is imported inside `@layer vendor`, ahead of ours.**
  [`styles/vendor/index.css`](./styles/vendor/index.css) imports `vanilla-cookieconsent`'s CSS with
  `layer(vendor)` and then [`styles/vendor/cookie-consent.css`](./styles/vendor/cookie-consent.css), so a rule there
  beats the library's at equal specificity by coming later in the same layer. Importing the library's CSS anywhere
  else, a component's frontmatter included, leaves it unlayered, and an unlayered declaration beats every
  layered one whatever its specificity: only the `--cc-*` custom properties on `#cc-main` would survive. The later
  layers (`theme`, `animations`, `base`) and the unlayered component sheets beat the library too, which is why
  nothing outside `cookie-consent.css` selects `#cc-main`.
- **The contact form's controller lives with its component, not in `utils/`.**
  [`components/contact/contact-form.ts`](./components/contact/contact-form.ts) is colocated beside `Contact.astro`,
  the same way `theme-toggle.ts` sits with the header: it belongs to one component and no other page loads it. It
  intercepts `submit`, posts JSON to `/api/contact`, disables the button and refuses a second submit while one is in
  flight, and writes the outcome into an `aria-live` status node, the response's own `error` when there is one
  ([ADR 0030](../../../docs/adr/0030-contact-messages-leave-through-cloudflares-send-email-binding.md)). It reads the
  error body through `contactMessageErrorSchema`, whose `error` (a non-empty string) and `field` (a `FailureField`)
  each fall back to `undefined` on their own, so a `field` naming no control still leaves a usable `error` on the
  status node. It sets `noValidate` on the form and runs the domain's per-field rules in the *touched* mode: a field
  is first checked when it is left, and from then on as it changes; a submit checks every field, writes each sentence
  into the field's own error node, sets `aria-invalid` and focuses the first wrong one, and no request leaves until
  the form is clean. A 400 that names a `field` lands on that field's error node the same way; every other failure
  goes to the status node. The `required`, `type="email"`, `minlength` and `maxlength` attributes stay on the
  controls for a client with scripting off.
- [`unshuffle.ts`](./utils/unshuffle.ts) de-obfuscates the contact details on the legal notice,
  [`legal-notice.astro`](../pages/legal-notice.astro). It is anti-scraping decoration, not a security control.
  Treat anything it protects as public.
- **The three legal pages are pinned by [`web/e2e/legal-pages.spec.ts`](../../e2e/legal-pages.spec.ts)**, which asserts each answers 200, renders an
  `h1`, and carries `robots: noindex, nofollow`. It also asserts `/privacy` uses the `summary` Twitter card and has
  **no** `og:image`, because the social preview for a privacy policy is a link nobody should be enticed to share.
  **[`SEO.astro`](./components/core/seo/SEO.astro) defaults `robots` to `index, follow`**, and each of the three legal pages overrides it in its own
  `metadata`. So a fourth one left out of `LEGAL_PAGES` has nothing asserting its `noindex` and, if the override
  is also forgotten, ships **indexed** by inheriting that default.
