# SVG Rendering

The calendar is rendered to an SVG **string** — no DOM, no canvas — so it works inside a Cloudflare Worker. The renderer is `infrastructure/rendering/svg-string-renderer.ts`, implementing the domain `SvgRenderer` function type. All layout constants and helpers live in `domain/services/svg-geometry.ts`, and per-shape cell markup in `domain/services/cell-shapes.ts`.

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

- **Month labels** come from `MONTHS` (12 short month names generated once via `Intl.DateTimeFormat("en", { month: "short" })`). `monthLabelPositions` emits a label at the first week of each new month, but only when that week's first day falls on/before day 7 — this prevents a stray label when a month barely peeks into a column.
- **Day-of-week labels** are `DOW = ["Mon", "Wed", "Fri"]`, drawn on alternating rows (rows 1, 3, 5) so they don't overlap.
- Labels use `font-family: ui-monospace,monospace`; month labels are `9.5px` with `0.04em` letter-spacing, day labels `9px`. Fills are low-opacity white (`rgba(255,255,255,0.45)` / `0.35`) so they read on both light and dark backgrounds.

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

The output is a single SVG string, returned with image and cache headers by the route — see **[API Reference](API-Reference)**.

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

## Accessibility & output

- The root `<svg>` carries `role="img"` and `aria-label="GitHub contribution calendar"`, so screen readers announce it as a single image rather than reading hundreds of cells.
- A `viewBox` plus explicit `width`/`height` keeps the image crisp at any scale.
- The background `<rect>` is emitted **only** when `background !== "transparent"`, so the default output composites cleanly onto any README theme.
- Output is a deterministic string (no DOM, no canvas), so identical inputs produce byte-identical SVGs — ideal for caching.

---

## See also

- **[Calendar Grid](Calendar-Grid)** — produces the cells this renders
- **[Web Application](Web-Application)** — how the SVG route is wired up
