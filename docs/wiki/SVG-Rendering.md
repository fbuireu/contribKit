# SVG Rendering

The calendar is rendered to an SVG **string** (no DOM, no canvas), so it works inside a Cloudflare Worker. The renderer is `infrastructure/rendering/svg-string-renderer.ts`, implementing the domain `SvgRenderer` function type. All layout constants and helpers live in `domain/services/svg-geometry.ts`, and per-shape cell markup in `domain/services/cell-shapes.ts`.

A second, near-identical renderer (`ui/components/grid/render-svg.ts`) runs in the browser for the live preview; see [Client-side rendering](#client-side-rendering-live-preview) below. Both share the same geometry and `renderCellShape`.

---

## Inputs

```
renderCalendarSvg(svgStringRenderer)({ calendar, options })
```

`options` carries:

| Option | Default | Notes |
|--------|---------|-------|
| `palette` | `github` | 5-color ramp (none → veryHigh) |
| `shape` | `rounded` | `rounded`, `square`, `circle`, `dot`, `hex` |
| `background` | `transparent` | skipped entirely when transparent |
| `cellSize` | `10` | `SVG_DEFAULT_CELL_SIZE` |
| `cellGap` | `2` | `SVG_DEFAULT_CELL_GAP` |
| `showLabels` | `true` | month + day-of-week labels |

---

## Geometry

```
cellWidth   = size + gap
totalWidth  = 53 × cellWidth + labelWidth + 2·padX
totalHeight = 7  × cellWidth + labelHeight + 2·padY
```

with `SVG_PAD_X/Y = 12`, `SVG_LABEL_WIDTH = 28`, `SVG_LABEL_HEIGHT = 18`. The grid is drawn inside a `<g>` translated past the labels.

### Labels

- **Month labels** come from `MONTH_LABELS` in `calendar-labels.ts` (12 short month names generated once via `Intl.DateTimeFormat("en", { month: "short" })`). `monthLabelPositions` emits a label at the first week of each new month, but only when that week's first day falls on/before day 7, which prevents a stray label when a month barely peeks into a column.
- **Day-of-week labels** are `WEEKDAY_LABELS = ["Mon", "Wed", "Fri"]`, drawn on alternating rows (rows 1, 3, 5) so they don't overlap.
- Labels use `font-family: ui-monospace,monospace`; month labels are `9.5px` with `0.04em` letter-spacing, day labels `9px`. Fills are low-opacity white (`rgba(255,255,255,0.45)` / `0.35`), which reads on a dark background and is close to invisible on a light one — a known defect recorded in [`web/src/infrastructure/CLAUDE.md`](https://github.com/fbuireu/ContribKit/blob/main/web/src/infrastructure/CLAUDE.md).

---

## Shapes

`radiusFor({ shape, size })` decides corner rounding:

| Shape | Radius |
|-------|--------|
| `rounded` | `2.5` |
| `square` | `0` |
| circle / dot / others | `size / 2` |

- **dot** uses a level-scaled radius: `dotRadius(level) = level === 0 ? 1.4 : 1.4 + level`.
- **hex** is drawn as a polygon via `hexPoints({ cx, cy, radius })`, computing six vertices offset by `π/6`.

`renderCellShape` emits the right markup per shape, shared between the server renderer and the client.

---

## Rendering flow

1. Compute dimensions and radius from options.
2. `chunkWeeks(calendar.days)` slices the 371-cell grid back into 53 weeks of 7.
3. Open the `<svg>` with a `viewBox`, `width`/`height`, and `role="img"` + `aria-label`.
4. Paint the background rect (only if not transparent).
5. Emit month and day-of-week `<text>` labels (when `showLabels`).
6. For each week/day, emit the cell shape filled with the palette color for its level.

The output is a single SVG string, returned with image and cache headers by the route. See **[API Reference](API-Reference)**.

---

## Colors

A palette is a 5-color ramp indexed by contribution level:

| Level | Ramp slot |
|-------|-----------|
| 0 | `none` |
| 1 | `low` |
| 2 | `medium` |
| 3 | `high` |
| 4 | `veryHigh` |

`paletteByKey(key)` resolves the ramp from the shared token JSON; an unknown key falls back to `github`. Because levels are clamped to `0–4` upstream (see **[Calendar Grid](Calendar-Grid)**), the color lookup is always in range.

---

## Client-side rendering (live preview)

The server renderer above powers the `/user/:username.svg` endpoint. The **landing page** renders its own previews in the browser with a twin renderer, `ui/components/grid/render-svg.ts` (`renderCalendarString`). It shares the same geometry (`calendarDimensions`, `radiusFor`) and the same `renderCellShape`, so a preview is pixel-faithful to the exported SVG. It differs from the server renderer in three ways:

| | Server (`svgStringRenderer`) | Client (`renderCalendarString`) |
|---|---|---|
| Colors | palette literals + `rgba(...)` label fills | same palette colors, but label text via CSS vars (`var(--text-dim)`, `var(--font-mono)`) so it tracks the theme |
| Sizing | fixed `width`/`height` | `width="100%"` + `style="display:block;overflow:visible"` for responsive layout |
| Per-cell | fill only | also emits `data-date`, plus `data-count` only when the count is known — cells with an unknown count omit it and the tooltip says so |

`render-svg.ts` also exports `shapePreviewSVG(kind)`, the tiny 20×20 swatch drawn inside each shape-picker button, using `SHAPE_PREVIEWS` and the `--contrib-peak` CSS var.

---

## The render loop (web UI)

The landing page has **no reactive framework**. The DOM itself is the source of truth, and one function re-renders everything.

**1. State.** Two singletons in `ui/utils/state.ts` hold the fetched data: `getDays()` / `setDays()` and the username. The active **shape** and **palette** are read straight from the DOM, from whichever control carries the `.active` class (`ui/utils/render.ts`):

```ts
getActivePalette = () => $("#palette-list .palette-row.active")?.dataset.key ?? DEFAULT_PALETTE_KEY;
getActiveShape   = () => $("#shape-list  .shape-btn.active")?.dataset.key   ?? DEFAULT_CELL_SHAPE;
```

**2. Single re-render entry point.** `renderCustomize()` reads the active palette/shape plus `getDays()` and rebuilds each grid's `innerHTML` via `renderCalendarString`, applying a per-surface preset (`HERO_GRID_PRESET` 13/3, `CUSTOMIZE_GRID_PRESET` 12/3, `EXPORT_GRID_PRESET` = defaults). It also repaints the legend swatches and the shape/palette labels, then cascades into `renderExportPreview()` (SVG/PNG/Markdown preview) and `renderWidget()` (the phone mock), all consuming the same getters.

**3. Controls trigger the loop.** The shape and palette pickers are roving radio groups wired in `ui/utils/page-init.ts`; their `onActivate` is `renderCustomize`:

```ts
initRadioList("#palette-list .palette-row");  // pick palette → renderCustomize
initRadioList("#shape-list .shape-btn");       // pick shape   → renderCustomize
```

Activating a button moves the `.active` class (`activateRadio`) and fires `renderCustomize`, which re-reads the new selection from the DOM.

**4. New data.** When a username is rendered, `renderFromGitHub` fetches `/api/contributions`, calls `setDays(buildGridFromApi(...))`, then `renderCustomize()`. The grid shape (53×7) is always rebuilt by [Calendar Grid](Calendar-Grid); the fetch only fills `level`/`count`.

In one line: **change shape/palette → `activateRadio` flips `.active` → `onActivate` runs `renderCustomize` → it reads selection from the DOM + cells from the singleton → `renderCalendarString` regenerates each grid's `innerHTML`.** The same flow runs after a fetch, just triggered by new data instead of a click.

> Until placeholder data is replaced, the initial grid comes from `generateData()` (see **[Deterministic Randomness](Mulberry32)**), so the preview is never empty on first load.

---

## Accessibility & output

- The root `<svg>` carries `role="img"` and `aria-label="GitHub contribution calendar"`, so screen readers announce it as a single image rather than reading hundreds of cells.
- A `viewBox` plus explicit `width`/`height` keeps the image crisp at any scale.
- The background `<rect>` is emitted **only** when `background !== "transparent"`, so the default output composites cleanly onto any README theme.
- Output is a deterministic string (no DOM, no canvas), so identical inputs produce byte-identical SVGs, which is ideal for caching.

---

## See also

- **[Calendar Grid](Calendar-Grid)** produces the cells this renders.
- **[Web Application](Web-Application)** covers how the SVG route is wired up.
- **[Deterministic Randomness](Mulberry32)** is the placeholder grid shown before any fetch.
