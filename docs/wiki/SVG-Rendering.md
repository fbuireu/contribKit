# SVG Rendering

The calendar is rendered to an SVG **string** (no DOM, no canvas), so it works inside a Cloudflare Worker. The renderer is [`infrastructure/rendering/svg-string-renderer.ts`](https://github.com/fbuireu/contribKit/blob/main/web/src/infrastructure/rendering/svg-string-renderer.ts), implementing the domain `SvgRenderer` function type. Per-shape cell markup is `domain/services/cell-shapes.ts`.

**The whole layout is one call.** `calendarLayout` in [`domain/services/svg-geometry.ts`](https://github.com/fbuireu/contribKit/blob/main/web/src/domain/services/svg-geometry.ts) chunks the days into weeks, sizes the document, clamps every Contribution Level and returns finished placements: `monthLabels`, `weekdayLabels` and `cells`, each already carrying its `x` and `y`. The pad, gutter and baseline constants and the per-shape radius rule are **private to that file**; `dotRadius`, `cornerRadiusFor` and `hexPoints` stay exported, because [`cell-shapes.ts`](https://github.com/fbuireu/contribKit/blob/main/web/src/domain/services/cell-shapes.ts) and the client renderer draw with them. They used to be nine exported primitives, so both renderers imported a dozen symbols each and wrote the same thirty-line walk; only the geometry was shared, and the composition was not.

A second renderer (`ui/components/grid/render-svg.ts`) runs in the browser for the live preview; see [Client-side rendering](#client-side-rendering-live-preview). Both take one `calendarLayout` call and `renderCellShape`, and keep only their own string templates.

---

## Inputs

```
svgStringRenderer({ calendar, options })
```

`options` carries:

| Option | Default | Notes |
|--------|---------|-------|
| `palette` | `github` | 5-color ramp (none → veryHigh) |
| `shape` | `rounded` | `rounded`, `square`, `circle`, `dot`, `hex` |
| `background` | `transparent` | skipped entirely when transparent |
| `cellSize` | `10` | `SVG_DEFAULT_CELL_SIZE`. **No caller ever sets it** |
| `cellGap` | `2` | `SVG_DEFAULT_CELL_GAP`. Same |
| `showLabels` | `true` | month + day-of-week labels. Same |

The last three are declared, forwarded to `calendarLayout`, and assigned by nobody. Cell Size as a person's choice is app-only ([ADR 0016](https://github.com/fbuireu/contribKit/blob/main/docs/adr/0016-cell-size-is-a-named-choice-in-the-app-and-fixed-geometry-on-the-web.md)); this is pixel geometry, and the endpoint exposes no size knob.

---

## Geometry

```
cellWidth   = size + gap
totalWidth  = 53 × cellWidth + labelWidth + 2·padX
totalHeight = 7  × cellWidth + labelHeight + 2·padY
```

with `SVG_PAD_X/Y = 12`, `SVG_LABEL_WIDTH = 28`, `SVG_LABEL_HEIGHT = 18`. The grid is drawn inside a `<g>` translated past the labels.

### Labels

- **Month labels** come from `MONTH_LABELS` in [`calendar-labels.ts`](https://github.com/fbuireu/contribKit/blob/main/web/src/domain/value-objects/calendar-labels.ts) (12 short month names generated once via `Intl.DateTimeFormat("en", { month: "short" })`). `calendarLayout` emits a label at the first week of each new month, but only when that week's first day falls on or before day 7, which prevents a stray label when a month barely peeks into a column. That yields exactly twelve distinct labels for every year from 2005 to 2030: the December spill at both ends never earns a thirteenth.
- **Day-of-week labels** are `WEEKDAY_LABELS = ["Mon", "Wed", "Fri"]`, drawn on alternating rows (rows 1, 3, 5) so they don't overlap.
- Labels use `font-family: ui-monospace,monospace`; month labels are `9.5px` with `0.04em` letter-spacing, day labels `9px`. Fills are low-opacity white (`rgba(255,255,255,0.45)` / `0.35`), which reads on a dark background and is close to invisible on a light one: a known defect recorded in [`web/src/infrastructure/CLAUDE.md`](https://github.com/fbuireu/ContribKit/blob/main/web/src/infrastructure/CLAUDE.md).

---

## Shapes

Corner rounding is decided inside `calendarLayout` and reaches the renderers as each cell's `radius`:

| Shape | Radius |
|-------|--------|
| `rounded` | `size × CORNER_RADIUS_RATIO`: **`2.0`** at the default size of 10 |
| `square` | `0` |
| circle / dot / hex | `size / 2` |

- **dot** uses a level-scaled radius: `dotRadius({ level, size })` is `1.4` at level 0 and `1.4 + level` above it, multiplied by `size / 10`. At level 4 that is 5.4 against a half-cell of 5: it overflows its own cell deliberately, and still fits the 12 px pitch.
- **hex** is drawn as a polygon via `hexPoints({ cx, cy, radius })`, computing six vertices offset by `π/6`.

The rounded corner was a fixed `2.5` here and `size × 0.2` in the app, at *every* size. The web adopted the app's ratio, so a published Embed's corner moved from 2.5 to 2.0: one rule across five renderers, at a visible cost taken on purpose ([ADR 0020](https://github.com/fbuireu/ContribKit/blob/main/docs/adr/0020-the-cell-geometry-is-the-apps-in-three-languages.md)).

`renderCellShape` emits the right markup per shape, shared between the server renderer and the client.

---

## Rendering flow

0. The route builds the lattice first, with `buildRollingGrid`. This is not optional: GitHub emits its
   table **weekday-major** (one `<tr>` per weekday, one `<td>` per week), so the scraped days arrive as all the
   Sundays, then all the Mondays, seven days apart. Slicing that in sevens renders the transpose of the calendar,
   with every cell after the first showing the wrong date. `buildRollingGrid` keys the days by date and walks 371
   of them from the Sunday that starts the window, so what reaches the renderer really is a grid.
1. One `calendarLayout` call returns the document size and every placement. **Neither renderer chunks weeks, computes a dimension, positions a label or derives a radius.**
2. Open the `<svg>` with a `viewBox`, `width`/`height`, and `role="img"` + `aria-label`.
3. Paint the background rect (only if not transparent).
4. Emit `layout.monthLabels` and `layout.weekdayLabels` as `<text>`.
5. Emit `layout.cells`, each filled with the palette color for its level.

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

The server renderer above powers the `/user/:username.svg` endpoint. The **landing page** renders its own previews in the browser with a twin renderer, `ui/components/grid/render-svg.ts` (`renderCalendarString`). It takes the same one `calendarLayout` call and the same `renderCellShape`, so a preview is pixel-faithful to the exported SVG. It differs from the server renderer only in its string templates:

| | Server (`svgStringRenderer`) | Client (`renderCalendarString`) |
|---|---|---|
| Label colour | hardcoded `rgba(255,255,255,…)` | `var(--text-dim)` / `var(--text-dimmer)`, so it tracks the page theme |
| Label font | a `font-family="ui-monospace,monospace"` **attribute** | `font-family:var(--font-mono)` inside a `style`, for the same reason |
| Month label opacity | none | an extra `opacity:.85` |
| Sizing | fixed `width`/`height` | `width="100%"` + `style="display:block;overflow:visible"` for responsive layout |
| Background | a `<rect>` when the Background is not transparent | never: the card behind it is the background |
| Consumed as | an `<img>` in someone else's document | live DOM on this page |
| Per-cell | fill only | also emits `data-date`, plus `data-count` only when the count is known: cells with an unknown count omit it and the tooltip says so |

[`render-svg.ts`](https://github.com/fbuireu/contribKit/blob/main/web/src/ui/components/grid/render-svg.ts) also exports `shapePreviewSVG(kind)`, the tiny 20×20 swatch drawn inside each shape-picker button, using `SHAPE_PREVIEWS` and the `--contrib-peak` CSS var.

---

## The render loop (web UI)

The landing page has **no reactive framework**. The DOM itself is the source of truth, and one function re-renders everything.

**1. State.** Two singletons in [`ui/utils/state.ts`](https://github.com/fbuireu/contribKit/blob/main/web/src/ui/utils/state.ts) hold the fetched data: `getDays()` / `setDays()` and the username. The active **shape** and **palette** are read straight from the DOM, from whichever control carries the `.active` class ([`ui/utils/render.ts`](https://github.com/fbuireu/contribKit/blob/main/web/src/ui/utils/render.ts)):

```ts
getActivePalette = () => paletteByKey($(Selector.ActivePaletteRow)?.dataset.key ?? DEFAULT_PALETTE_KEY);
getActiveShape   = () => { const k = $(Selector.ActiveShapeButton)?.dataset.key;
                           return k !== undefined && isCellShape(k) ? k : DEFAULT_CELL_SHAPE; };
```

**Both getters guard, and for the same reason.** A `data-key` is markup, so it can name a palette
[`shared/palettes.json`](https://github.com/fbuireu/contribKit/blob/main/shared/palettes.json) does not define or a shape the `CellShape` union does not: `paletteByKey` defaults and
`isCellShape` rejects, and neither hands a bare string on. `getActivePalette` returns a `Palette` rather than a key,
through the same guarded lookup the SVG endpoint uses; the three callers indexed `PALETTES` directly and would have
thrown a `TypeError` reading `.colors` of `undefined`. `getActiveShape` returns a `CellShape` rather than a
`string`, and used to hand that string to three callers, each of which re-guarded or did not. It
also means the key it reports is the key it used, so the label under the picker cannot disagree with the colours on
screen.

**2. Single re-render entry point.** `renderCustomize()` reads the active palette/shape plus `getDays()` and rebuilds each grid's `innerHTML` via `renderCalendarString`, applying a per-surface preset (`HERO_GRID_GEOMETRY` 13/3, `CUSTOMIZE_GRID_GEOMETRY` 12/3, `EXPORT_GRID_GEOMETRY` = defaults). It also repaints the legend swatches and the shape/palette labels, then cascades into `renderExportPreview()` (SVG/PNG/Markdown preview) and `renderWidget()` (the phone mock), all consuming the same getters.

**3. Controls trigger the loop.** The shape and palette pickers are roving radio groups wired in [`ui/utils/page-init.ts`](https://github.com/fbuireu/contribKit/blob/main/web/src/ui/utils/page-init.ts); their `onActivate` is `renderCustomize`:

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
