# web/src/ui/components

Every Astro component, grouped by role. CSS, component-local logic and tests are colocated in each folder.

## Layout

| Directory | Role |
|---|---|
| `core/` | App shell and head plumbing on every page: `layouts/` (`BaseLayout`), `header/`, `footer/`, `seo/`, `analytics/`, `cookie-consent/`. |
| `hero/` · `customize/` · `export/` · `how-it-works/` · `widget/` | Home-page feature sections — one folder each (`.astro` + `.css` + any local logic). |
| `grid/` | The contribution graph: `CellTooltip` plus its rendering utilities (`calendar`, `render-svg`, `mini-grid`, `contribution`, `grid-presets`). |
| `error/` | The 404/500 UI — `ErrorView` + `ContributionCode` + `glyph-utils`, generic over code and tone. |
| `icons/` | Inline SVG icon components — no external icon library. |
| `legal/` | Shared styles for the legal pages. |

## Invariants & rules

- **Props in, markup out.** No fetching, no domain logic. Interactivity lives in `ui/utils/page-init.ts`, not in
  per-component `<script>` blocks.
- **CSS is colocated**: `Hero.astro` imports `./hero.css`, and so on.
- **Palette colours and Cell Shapes come from `@domain/value-objects/`.** Never a hex literal, never a bare shape
  string. Anything fed from a DOM `dataset` is re-guarded before it is used as a key: `render-svg.ts` calls
  `isCellShape`, and `getActivePalette` in `ui/utils/render.ts` returns a `Palette` through `paletteByKey` rather
  than a key its callers would index `PALETTES` with. The shape path had that guard from the start and the palette
  path did not, so a `data-key` naming a palette `shared/palettes.json` does not define threw a `TypeError` in
  three renderers instead of falling back.
- **The number in the hero goes through `formatTotalContributions`**, in `grid/contribution.ts`, which is the same
  function the SSR page and the client renderer call. It prints `unknown` for a `null` total. Never interpolate
  `stats.totalContributions` directly.
- `core/` renders on every page; `BaseLayout` composes `header` + `footer` + the head integrations (`seo`,
  `analytics`, `cookie-consent`).

## `grid/` — the client renderer, and how it differs from the server's

`render-svg.ts` and `svgStringRenderer` in `infrastructure/rendering/` both draw the calendar, and they share
`@domain/services/cell-shapes` and `@domain/services/svg-geometry` so a cell is identical in both. The differences
are deliberate and worth knowing:

|  | Server (`svgStringRenderer`) | Client (`render-svg.ts`) |
| --- | --- | --- |
| Per-cell attributes | none — fill only | `data-date`, plus `data-count` **only when the count is known** |
| Root sizing | fixed `width`/`height` in pixels | `width="100%"` with `overflow:visible`, so it scales in the card |
| Label colour | hardcoded `rgba(255,255,255,…)` | `var(--text-dim)` / `var(--text-dimmer)`, so it follows the page theme |
| Consumed as | an `<img>` in someone else's document | live DOM on this page |

Everything the two have in common is in `@domain/services/svg-geometry`, and that now includes the *placement*, not
only the dimensions: `monthLabelPoint`, `weekdayLabelPoint`, `gridOrigin` and `cellPoint`, plus
`CALENDAR_ARIA_LABEL`. Those expressions — including the `index * 2 + 1` that encodes "three weekday labels on
alternate rows" — were written out verbatim in both files, so the rule lived in two places and in neither module.
What is left in each renderer is only what the table above says differs.

**One asymmetry the table does not cover, and it is deliberate:** the client re-runs `clampLevel` and falls back with
`palette[level] || palette[0]`, and the server does neither. The server's `day.level` is a `ContributionLevel`, a
0–4 union the type system guarantees; the client's arrives as a bare `number` on `RenderCalendarParams`, fed from
placeholder data and from the API. Each guards exactly what its own input type fails to.

**`data-count` is omitted, not zeroed, for an unknown Count.** `CellTooltip` reads that absence and says
"Contributions unknown on …" rather than showing a number nobody measured. Emitting `data-count="0"` would be
inventing data for the user.

The three presets in `grid-presets.ts` — `HERO_GRID_PRESET` (13/3), `CUSTOMIZE_GRID_PRESET` (12/3) and
`EXPORT_GRID_PRESET` — are the only sizes the web draws. They are pixel geometry, not the glossary's Cell Size
([ADR 0016](../../../../docs/adr/0016-cell-size-is-a-named-choice-in-the-app-and-fixed-geometry-on-the-web.md)).
`EXPORT_GRID_PRESET` is pinned to the domain defaults, so the export preview matches what the SVG endpoint emits —
a test asserts exactly that, and it is the reason the constant is not just `{ size: 10, gap: 2 }` written out.

`calendar.ts` holds `generateData()`, the placeholder grid, driven by `mulberry32` and the `LEVEL_THRESHOLDS` /
`COUNT_SPREAD_PER_LEVEL` tables. It is the only code in the project allowed to invent a Count, and only because the
result is explicitly not anybody's data. It is also the one grid that is **not** a calendar year: it ends on the
Saturday of the current week and walks 371 days back from there, so it never shows leading empty months.

## `error/`

`404.astro` and `500.astro` render the **same** `ErrorView` and `ContributionCode`, driven entirely by props. Never
fork a second copy for a new status. Tone is token-only — `.error-page.is-danger` remaps the `--grid-*` / `--error-*`
custom properties to the red ramp — so a new tone is a class and a token block, never an inlined hex.

## Gotchas

- **`ContributionCode.astro` has its own `CELL_SIZE = 18` and `CELL_GAP = 5`,** unrelated to the grid presets and to
  the domain geometry. It draws a glyph out of squares, not a calendar; do not "unify" it with the presets.
- **`mini-grid.ts` also has its own `CELL_SIZE = 4`** and emits raw `<rect>` markup rather than going through
  `renderCellShape`, because the widget preview is a thumbnail where shapes would not read. That is why a new Cell
  Shape does not automatically appear there. Its array is called `levels`, not days — it holds one level per square
  and no dates at all.
- **`shapePreviewSVG` draws its own miniatures** rather than reusing `renderCellShape`, at a 20×20 viewBox with
  hand-tuned radii, because a 10 px cell scaled up reads as a blur. Its table is keyed on `CellShape`, so adding a
  member fails to compile here — which is the intended reminder.
- **The consent banner hides itself from automation.** `vanilla-cookieconsent`'s `hideFromBots` suppresses it
  whenever `navigator.webdriver` is set, so a Playwright run sees no banner at all unless it poses as a real
  browser first — which is why the e2e spec opens with an `addInitScript` redefining that property. An e2e test
  that asserts anything about consent and skips that step fails for a reason that has nothing to do with the code.
- The CSP in `web/src/middleware.ts` allows `img-src 'self' data:` only, and the middleware sets it
  **unconditionally** — there is no dev branch, and `astro dev` runs the same middleware. A component that reaches
  for a remote image is blocked identically in both, so at least the failure is not a surprise at deploy time.
