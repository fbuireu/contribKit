# web/src/ui/components

Every Astro component, grouped by role. CSS, component-local logic and tests are colocated in each folder.

## Layout

| Directory | Role |
|---|---|
| `core/` | App shell and head plumbing on every page: `layouts/` (`BaseLayout`), `header/`, `footer/`, `seo/`, `telemetry/`, `cookie-consent/`. `BaseLayout` composes `header` and `footer`, `seo` and `telemetry` in the head, and `cookie-consent` at the end of the body. |
| `hero/` · `customize/` · `export/` · `how-it-works/` · `widget/` | Home-page feature sections: one folder each (`.astro` + `.css` + any local logic). |
| `grid/` | The Contribution Calendar: `CellTooltip` plus its rendering utilities (`calendar`, `render-svg`, `mini-grid`, `contribution`, `grid-geometry`). |
| `contact/` | The `/contact` page's section: `Contact.astro`, its colocated `contact.css`, and `contact-form.ts`, the client controller that posts to `/api/contact`. It is the only component group that submits anything ([ADR 0030](../../../../docs/adr/0030-contact-messages-leave-through-cloudflares-send-email-binding.md)). |
| `error/` | The 404/500 UI: `ErrorView` + `ContributionCode` + `glyph-utils`, generic over code and tone. |
| `icons/` | Inline SVG icon components: no external icon library. |
| `legal/` | Shared styles for the legal pages. |

- **The figures in the hero go through `formatTotalContributions` and `formatStreak`**, in
  [`grid/contribution.ts`](./grid/contribution.ts), the functions `Hero.astro` and the client's `updateHeroStats`
  both call, so a figure that is `null` reads `unknown` on either side.
- **The contact form's limits are interpolated out of
  [`@domain/value-objects/contact-message`](../../domain/value-objects/contact-message.ts).** The markup carries
  `required`, `type="email"`, `minlength` and `maxlength` and no `novalidate`; the controller sets `noValidate`
  itself, so with scripting the domain's per-field rules answer inline in the `field-error` node each control names
  through `aria-describedby`, and without it the browser's own checks still refuse a bad submission. The error nodes
  and the failed status are `--danger` on the page's colours, and they restate `::selection`, because the default
  selection highlight is unreadable under red text.
- **`core/telemetry/` is the only place the browser talks to a vendor.** `telemetry.ts` is `initTelemetry`, which
  applies the consent on load and again on every `cc:onConsent` and `cc:onChange`: it syncs Google's consent state
  and loads each tag once its service is accepted. `usage-event.ts` is `recordUsageEvent` and the closed sets every
  Usage Event is built from; `UsageEventProperties` is keyed by event name, so a property the map does not declare
  is a type error, and the only `string`-typed property is the Palette key, which `getActivePalette` has already
  resolved through `paletteByKey`. `usage-event-links.ts` is the declarative half, one delegated click listener over
  `data-usage-event` links, and it re-validates what it reads, so hand-written markup cannot forward a free value.
  The service names and the category, `ConsentService` and `ConsentCategory`, are declared once, in
  [`cookie-consent/config.ts`](./core/cookie-consent/config.ts), which hands the same names to the banner.

## `grid/`: the client renderer, and how it differs from the server's

[`render-svg.ts`](./grid/render-svg.ts) and `svgStringRenderer` in `infrastructure/rendering/` both draw the calendar, and **both get their
whole geometry from one call to `calendarLayout`** in `@domain/services/svg-geometry` and their cells from
`@domain/services/cell-shapes`, so a cell is identical in both by construction. The differences are deliberate:

|  | Server (`svgStringRenderer`) | Client (`render-svg.ts`) |
| --- | --- | --- |
| Per-cell attributes | none: fill only | `data-date`, plus `data-count` **only when the count is known** |
| Root sizing | fixed `width`/`height` in pixels | `width="100%"` with `overflow:visible`, so it scales in the card |
| Label colour | hardcoded `rgba(255,255,255,…)` | `var(--text-dim)` / `var(--text-dimmer)`, so it follows the page theme |
| Label font | a `font-family="ui-monospace,monospace"` **attribute** | `font-family:var(--font-mono)` inside a `style`, for the same reason |
| Month label opacity | none | an extra `opacity:.85` |
| Background | a `<rect>` when the Background is not transparent | never: the card behind it is the background |
| Consumed as | an `<img>` in someone else's document | live DOM on this page |

That table is the complete list. Nothing detects a new divergence; adding a row is manual.

**`renderCalendarString` takes a `PaletteColors` and a `CellShape` and trusts both.** The tuple type makes the five
colours a compile error to break, and each day's level is already a `ContributionLevel`, because `contributionDay`
clamps it at construction. `RenderCalendarStringParams` lives beside it in [`render-svg.ts`](./grid/render-svg.ts):
anything a renderer's caller must know goes beside the renderer, never in [`calendar.ts`](./grid/calendar.ts), the
placeholder generator. `shapePreviewSVG` takes a `CellShape` too, because [`Customize.astro`](./customize/Customize.astro) maps over `CELL_SHAPES`
and the value flows *into* the markup rather than out of it.

**An unknown Count leaves no `data-count`.** [`ui/utils/cell-tooltip.ts`](../utils/cell-tooltip.ts) reads that absence as `null`, and a
value that is not a whole number of contributions the same way, and `formatContribLabel` says "Contributions unknown
on …".

The three fixed geometries in [`grid-geometry.ts`](./grid/grid-geometry.ts) (`HERO_GRID_GEOMETRY` (13/3), `CUSTOMIZE_GRID_GEOMETRY` (12/3) and
`EXPORT_GRID_GEOMETRY`) are the only ones `renderCalendarString` is called with; the Home Screen Widget preview in
`mini-grid.ts` keeps its own size (see Gotchas). They are pixel geometry, not the glossary's Cell Size
([ADR 0016](../../../../docs/adr/0016-cell-size-is-a-named-choice-in-the-app-and-fixed-geometry-on-the-web.md)).
`EXPORT_GRID_GEOMETRY` is pinned to the domain defaults, so the export preview matches what the SVG endpoint emits;
a test asserts exactly that.

**The export tabs' figures are computed on the server and nothing on the client rewrites them.**
[`Export.astro`](./export/Export.astro) receives the rendered preview and not the days behind it, so the PNG tab asks `calendarLayout`
about an empty day list and prints `24×108` beside a `660×108` preview, and the SVG tab prints
`WEEKS_PER_YEAR×DAYS_PER_WEEK`. No tab carries a byte size, because the web emits no file: `renderExportPreview`
gives SVG and Markdown a copy button and the PNG tab a preview with no download. `buildSvgLines` takes the visitor's
Palette and Cell Shape and its radius from `cornerRadiusFor`, so the SVG preview's sample Cells look like the ones
the copy button copies; [`code-preview.test.ts`](./export/code-preview.test.ts) pins that. The Markdown tab shows
exactly the one line its button copies: `buildMarkdownLines` and `markdownSnippet` both read the snippet's tokens
from one function, so the preview cannot drift from the copy. The SVG preview's view box is its own
`WEEKS_PER_YEAR` step count, without `calendarLayout`'s padding.

`calendar.ts` holds `generateData()`, the placeholder grid, driven by `mulberry32` and the `LEVEL_THRESHOLDS` /
`COUNT_SPREAD_PER_LEVEL` tables. It is the one grid the landing page draws that is **not** a Year: it ends on the
Saturday of the current week and walks 371 days back from there, so it never shows leading empty months.

## `error/`

[`404.astro`](../../pages/404.astro) and [`500.astro`](../../pages/500.astro) share `ErrorView` and `ContributionCode`. Tone is token-only
(`.error-page.is-danger` remaps the `--grid-*` / `--error-*` custom properties to the red ramp).

## Gotchas

- **[`ContributionCode.astro`](./error/ContributionCode.astro) has its own `CELL_SIZE = 18` and `CELL_GAP = 5`,** unrelated to the grid geometries and
  to the domain geometry. It draws a glyph out of squares, not a calendar
  ([ADR 0020](../../../../docs/adr/0020-the-cell-geometry-is-the-apps-in-three-languages.md) keeps it, `mini-grid.ts`
  and `shapePreviewSVG` out of the Cell geometry).
- **[`mini-grid.ts`](./grid/mini-grid.ts) also has its own `CELL_SIZE = 4`** and emits raw `<rect>` markup rather than going through
  `renderCellShape`, because the Home Screen Widget preview is a thumbnail where shapes would not read. That is why a
  new Cell Shape does not automatically appear there. Its array is called `levels`, not days: it holds one level per
  rect and no dates at all.
- **It also carries its own `LEVEL_THRESHOLDS`, and those numbers are not `calendar.ts`'s.** Both tables spell the
  field `minScore`, which invites unifying the values. The two score the placeholder differently: `calendar.ts`
  builds a weekday-damped score around a rising base and compares with `>=`, while this one adds a per-week ramp to a
  raw `mulberry32` draw and compares with `>`. The thresholds are tuned against those two scales and mean nothing
  swapped over.
- **`shapePreviewSVG` draws its own miniatures** rather than reusing `renderCellShape`, at a 20×20 viewBox with
  hand-tuned radii, because a 10 px cell scaled up reads as a blur. Its table is keyed on `CellShape`, so adding a
  member fails to compile here, which is the intended reminder.
- **The header's "get app" is an anchor, and it has to stay one.** Below 720px [`header.css`](./core/header/header.css) hides every
  `.nav-links a` except `.nav-cta`, so the call to action is an `<a class="nav-cta">` with an `href`; if it ever
  needs script, it still needs the `href` underneath it. "get app" means the Android app: a web-install affordance
  such as `<install>` installs the **web** app this page's manifest describes, a second artefact, so it gets a label
  of its own rather than this one.
- **The values this project declares that cross into the `is:inline` head scripts all go through `define:vars`.**
  An `is:inline` script cannot import, so the values are read in the frontmatter and injected: `BaseLayout` takes
  `COLOR_SCHEME_KEY` and `COLOR_SCHEME_META_SELECTOR` from [`header/theme-toggle.ts`](./core/header/theme-toggle.ts), `ThemeClass` from
  [`ui/utils/dom-contract.ts`](../utils/dom-contract.ts) and `ThemeChoice` from [`telemetry/usage-event.ts`](./core/telemetry/usage-event.ts); `Telemetry` takes `CONSENT_COOKIE_NAME` and `ConsentCategory` from
  [`cookie-consent/config.ts`](./core/cookie-consent/config.ts), which also hands `CONSENT_COOKIE_NAME` to the banner as its cookie name, and
  `GoogleConsentState` from [`telemetry/telemetry.ts`](./core/telemetry/telemetry.ts). A literal typed into one of those scripts is invisible to
  the typecheck, so a rename leaves the script reading nothing: the analytics gate falls through to
  `GoogleConsentState.Denied`, which fails safe, and the theme bootstrap paints the wrong theme until the toggle's
  script runs.
- **A `define:vars` script is already wrapped in an IIFE by Astro**: the compiler emits
  `<script>(function(){ … })();</script>`, so the injected `const`s and the body's own stay out of the global scope.
  Write the body flat; do not add a block or an IIFE for scoping that Astro already provides.
- **The consent banner hides itself from automation.** `vanilla-cookieconsent`'s `hideFromBots` suppresses it
  whenever `navigator.webdriver` is set, so a Playwright run sees no banner at all unless it poses as a real
  browser first, which is why the consent case in [`e2e/index.spec.ts`](../../../e2e/index.spec.ts) starts with an `addInitScript`
  redefining that property. An e2e test that asserts anything about consent and skips that step fails for a reason
  that has nothing to do with the code.
- The CSP in [`web/src/middleware.ts`](../../middleware.ts) allows `img-src 'self' data:` only, and the middleware sets it
  **unconditionally**: there is no dev branch, and `astro dev` runs the same middleware. A component that reaches
  for a remote image is blocked identically in both, so at least the failure is not a surprise at deploy time.
