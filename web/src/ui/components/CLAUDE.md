# web/src/ui/components

Every Astro component, grouped by role. CSS, component-local logic and tests are colocated in each folder.

## Layout

| Directory | Role |
|---|---|
| `core/` | App shell and head plumbing on every page: `layouts/` (`BaseLayout`), `header/`, `footer/`, `seo/`, `analytics/`, `cookie-consent/`. |
| `hero/` · `customize/` · `export/` · `how-it-works/` · `widget/` | Home-page feature sections: one folder each (`.astro` + `.css` + any local logic). |
| `grid/` | The contribution graph: `CellTooltip` plus its rendering utilities (`calendar`, `render-svg`, `mini-grid`, `contribution`, `grid-presets`). |
| `error/` | The 404/500 UI: `ErrorView` + `ContributionCode` + `glyph-utils`, generic over code and tone. |
| `icons/` | Inline SVG icon components: no external icon library. |
| `legal/` | Shared styles for the legal pages. |

## Invariants & rules

The layer's rules (props in / markup out, colocated CSS, Palette colours and Cell Shapes from
`@domain/value-objects/`) are in the [parent guide](../CLAUDE.md) and are not restated here. What this folder adds:

- **Anything fed from a DOM `dataset` is guarded where it is read, not where it is used.** `getActiveShape` and
  `getActivePalette` in [`ui/utils/render.ts`](../utils/render.ts) are the two places a `data-key` becomes a `CellShape` or a `Palette`,
  through `isCellShape` and `paletteByKey`. The palette path had no guard at all until a `data-key` naming a
  palette [`shared/palettes.json`](../../../../shared/palettes.json) does not define threw a `TypeError` in three renderers; the shape path had one
  and then `renderCalendarString` ran it a second time, which is the guard that has since gone. A renderer takes
  the typed value and trusts it: `shapePreviewSVG` takes a `CellShape` too, because [`Customize.astro`](./customize/Customize.astro) maps over
  `CELL_SHAPES` and the value flows *into* the markup rather than out of it.
- **The number in the hero goes through `formatTotalContributions`**, in [`grid/contribution.ts`](./grid/contribution.ts), which is the same
  function the SSR page and the client renderer call. It prints `unknown` for a `null` total. Never interpolate
  `stats.totalContributions` directly.
- `core/` renders on every page; `BaseLayout` composes `header` + `footer` + the head integrations (`seo`,
  `analytics`, `cookie-consent`).

## `grid/`: the client renderer, and how it differs from the server's

[`render-svg.ts`](./grid/render-svg.ts) and `svgStringRenderer` in `infrastructure/rendering/` both draw the calendar. **Both get their
whole geometry from one call to `calendarLayout`** in `@domain/services/svg-geometry`, and their cells from
`@domain/services/cell-shapes`, so a cell is identical in both by construction. The differences are deliberate and
worth knowing:

|  | Server (`svgStringRenderer`) | Client (`render-svg.ts`) |
| --- | --- | --- |
| Per-cell attributes | none: fill only | `data-date`, plus `data-count` **only when the count is known** |
| Root sizing | fixed `width`/`height` in pixels | `width="100%"` with `overflow:visible`, so it scales in the card |
| Label colour | hardcoded `rgba(255,255,255,…)` | `var(--text-dim)` / `var(--text-dimmer)`, so it follows the page theme |
| Label font | a `font-family="ui-monospace,monospace"` **attribute** | `font-family:var(--font-mono)` inside a `style`, for the same reason |
| Month label opacity | none | an extra `opacity:.85` |
| Background | a `<rect>` when the Background is not transparent | never: the card behind it is the background |
| Consumed as | an `<img>` in someone else's document | live DOM on this page |

That table is the complete list, and it took three passes to become one: the font-family and the month-label opacity rows sat outside it while the guide claimed completeness, which is the failure mode a table like this has. Nothing detects a new divergence; adding a row is manual. Each renderer is a loop over `layout.monthLabels`, `layout.weekdayLabels`
and `layout.cells`, emitting its own strings; neither chunks weeks, computes a dimension, positions a label or
derives a radius. Both used to, identically: twelve imports each and the same thirty-line walk, down to a
byte-identical closing `parts.push("</g></svg>")`. Only the geometry primitives had been shared, so the *rule* was
in one place and the *composition* was in two.

**Collapsing the two into one parameterised walk was designed and rejected.** The config it would need is
`rootAttributes` (fixed pixels against `width="100%"`), `background` (server only), a style string for each of the
two label kinds, and an optional per-cell attribute callback: five fields, one of them a function, in front of a
thirty-line loop. That is the shallow-module failure one level up, where the interface costs as much as the body it
hides.

**Two of the nine rows were deleted rather than parameterised, which is the cheaper move and is done.** The table
is seven rows now. `renderCalendarString` takes a `PaletteColors` and a `CellShape` rather than a `readonly
string[]` and a `string`, so `palette[level] || palette[0]` and the `isCellShape` re-guard both went: the tuple
type makes the five-ness a compile error to break, and `calendarLayout` already runs every level through
`clampLevel`. Every production caller was passing a typed shape already, and [`index.astro`](../../pages/index.astro) stopped spreading
`PALETTES.github.colors` into a plain array to keep it. Only the tests were handing over bare strings, and a typo
in one is now a type error rather than a silent fallback to `rounded`.

Do not re-propose the unification without a config smaller than five fields. Deleting a row is always cheaper than
parameterising it, and three of the seven that remain are label styling: colour, font and the month-label
opacity. That is one difference wearing three rows, and omitting exactly the last two is the mistake this table
has already made once.

**One asymmetry the table used to carry has gone:** the client re-ran `clampLevel` and the server did not, because
the server's `day.level` is a type-guaranteed 0–4 union while the client's arrives from placeholder data and from
the API. `calendarLayout` clamps for both now: a no-op on the typed path, and one fewer thing for a renderer to
remember.

**`data-count` is omitted, not zeroed, for an unknown Count.** `CellTooltip` reads that absence and says
"Contributions unknown on …" rather than showing a number nobody measured. Emitting `data-count="0"` would be
inventing data for the user.

The three presets in [`grid-presets.ts`](./grid/grid-presets.ts) (`HERO_GRID_PRESET` (13/3), `CUSTOMIZE_GRID_PRESET` (12/3) and
`EXPORT_GRID_PRESET`) are the only sizes the web draws. They are pixel geometry, not the glossary's Cell Size
([ADR 0016](../../../../docs/adr/0016-cell-size-is-a-named-choice-in-the-app-and-fixed-geometry-on-the-web.md)).
`EXPORT_GRID_PRESET` is pinned to the domain defaults, so the export preview matches what the SVG endpoint emits.
A test asserts exactly that, and it is the reason the constant is not just `{ size: 10, gap: 2 }` written out.

**The export tiles compute their own numbers, and the code preview draws the visitor's own choices.**
[`Export.astro`](./export/Export.astro) advertised `2880×720 · transparent` and byte sizes of `186 KB` / `24 KB` / `410 B`. The real
document is **660×108** (`calendarLayout` says so, and the tile asks it now), and the web emits no file at all:
`renderExportPreview` gives SVG and Markdown a copy button and the PNG tab a preview with no download anywhere, so
`186 KB` was the weight of something that does not exist. The byte figures are gone rather than re-guessed. This is
the same defect the app's format tile carried; it was fixed there first and left standing here, which is what
"fixed" in a guide will do if only one of two surfaces is checked.

`buildSvgLines` takes the Palette and the Cell Shape. It was a module-level constant built from
`PALETTES.github.colors` with a hardcoded `rx="2"`, while the copy button beside it copied
`renderCalendarString` with the visitor's real selection: **pick Nord and hex and the preview showed GitHub-green
rects while the clipboard got Nord polygons.** Its radius comes from `cornerRadiusFor` now rather than being a
fourth spelling of the corner constant. [`code-preview.test.ts`](./export/code-preview.test.ts) already had a test named "shows exactly what
`markdownSnippet` copies"; the SVG branch has the equivalent now.

**`RenderCalendarParams` belongs to the renderer, not to the placeholder generator.** It sat in [`calendar.ts`](./grid/calendar.ts),
which never referenced it, so `render-svg.ts` imported its own signature from the fake-data module: an import
direction with no reason to exist. Anything a renderer's caller must know goes beside the renderer.

`calendar.ts` holds `generateData()`, the placeholder grid, driven by `mulberry32` and the `LEVEL_THRESHOLDS` /
`COUNT_SPREAD_PER_LEVEL` tables. It is the only code in the project allowed to invent a Count, and only because the
result is explicitly not anybody's data. It is also the one grid that is **not** a calendar year: it ends on the
Saturday of the current week and walks 371 days back from there, so it never shows leading empty months.

## `error/`

[`404.astro`](../../pages/404.astro) and [`500.astro`](../../pages/500.astro) share `ErrorView` and `ContributionCode`. The [pages guide](../../pages/CLAUDE.md)
states the rule. Tone is token-only (`.error-page.is-danger` remaps the `--grid-*` / `--error-*`
custom properties to the red ramp), so a new tone is a class and a token block, never an inlined hex.

## Gotchas

- **[`ContributionCode.astro`](./error/ContributionCode.astro) has its own `CELL_SIZE = 18` and `CELL_GAP = 5`,** unrelated to the grid presets and to
  the domain geometry. It draws a glyph out of squares, not a calendar; do not "unify" it with the presets.
- **[`mini-grid.ts`](./grid/mini-grid.ts) also has its own `CELL_SIZE = 4`** and emits raw `<rect>` markup rather than going through
  `renderCellShape`, because the widget preview is a thumbnail where shapes would not read. That is why a new Cell
  Shape does not automatically appear there. Its array is called `levels`, not days: it holds one level per square
  and no dates at all.
- **It also carries its own `LEVEL_THRESHOLDS`, and those numbers are not `calendar.ts`'s.** Both tables now spell
  the field `minScore`, which invites unifying the values. Do not. The two score the placeholder differently:
  `calendar.ts` builds a weekday-damped score around a rising base and compares with `>=`, while this one adds a
  column ramp to a raw `mulberry32` draw and compares with `>`. The thresholds are tuned against those two scales
  and mean nothing swapped over. Neither is anybody's data
  ([the Count invention rule](../../domain/CLAUDE.md) applies to both).
- **`shapePreviewSVG` draws its own miniatures** rather than reusing `renderCellShape`, at a 20×20 viewBox with
  hand-tuned radii, because a 10 px cell scaled up reads as a blur. Its table is keyed on `CellShape`, so adding a
  member fails to compile here, which is the intended reminder.
- **Three string contracts cross into the `is:inline` head scripts, and all three go through `define:vars`.**
  An `is:inline` script cannot import, so the values are read in the frontmatter and injected: `BaseLayout` takes
  `COLOR_SCHEME_KEY`, `COLOR_SCHEME_META_SELECTOR` and `ThemeClass` from [`header/theme-toggle.ts`](./core/header/theme-toggle.ts), and `Analytics`
  takes `CONSENT_COOKIE_NAME` and `ANALYTICS_CATEGORY` from [`cookie-consent/config.ts`](./core/cookie-consent/config.ts). Each was spelled twice
  before, in two files with nothing tying them: the FOUC bootstrap and the toggle both hardcoded
  `'color-scheme'` and `theme-${scheme}`, and the analytics gate matched `/(^| )cc_cookie=([^;]+)/` against a name
  the consent config declared separately. **Renaming either used to leave a script silently reading nothing**.
  For the consent one that means falling through to `'denied'`, which fails safe, while the theme one flashes
  the wrong palette before paint.
- **A `define:vars` script is already wrapped in an IIFE by Astro, and a bare `{ }` block inside one blinds
  `astro check`.** `BaseLayout`'s bootstrap used to wrap itself in a block to keep its `const` out of the global
  scope: necessary while the script took no variables, and redundant the moment it did, because the rendered
  output is `<script>(function(){ … })()</script>`. Keeping the block cost two `ts(2570) Could not find name`
  hints against the injected names, which is how it was noticed. Write the body flat; do not add a block or an
  IIFE back for scoping that Astro already provides.
- **The consent banner hides itself from automation.** `vanilla-cookieconsent`'s `hideFromBots` suppresses it
  whenever `navigator.webdriver` is set, so a Playwright run sees no banner at all unless it poses as a real
  browser first, which is why the e2e spec opens with an `addInitScript` redefining that property. An e2e test
  that asserts anything about consent and skips that step fails for a reason that has nothing to do with the code.
- The CSP in [`web/src/middleware.ts`](../../middleware.ts) allows `img-src 'self' data:` only, and the middleware sets it
  **unconditionally**: there is no dev branch, and `astro dev` runs the same middleware. A component that reaches
  for a remote image is blocked identically in both, so at least the failure is not a surprise at deploy time.
