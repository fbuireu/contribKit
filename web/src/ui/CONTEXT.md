# ui/

Presentation layer. Astro components, client-side interactivity, shared utilities, and styles. Depends on `domain/` and `application/`. Never imports from `infrastructure/` or `pages/`.

## Layout

| Directory | Contents |
|---|---|
| `components/` | Astro components — one per UI section, CSS colocated alongside each file |
| `components/core/` | Generic infrastructure-level components (`SEO`) with no domain coupling |
| `components/layouts/` | HTML shell layouts (`BaseLayout`) — every page must use one |
| `components/icons/` | Inline SVG icon components — no external icon library |
| `lib/` | Shared TypeScript utilities used by components and pages |
| `lib/calendar-utils.ts` | `Cell`, `RenderCalendarParams`, `CellSummary`, `MONTHS`, `DOW`, `buildCalendarGrid`, `buildGridFromApi`, `rehydrateCells`, `summarize`, `generateData` |
| `lib/render-svg.ts` | `renderCalendarString`, `shapePreviewSVG` — single SVG renderer (string output, valid for both inline HTML and standalone file) |
| `lib/code-preview.ts` | `SVG_LINES`, `MD_LINES`, `buildCodeBlock` |
| `lib/page-init.ts` | Client-side page controller — exports `initPage()`. All UI state, event wiring, and DOM rendering for `pages/index.astro`. |
| `styles/` | Global CSS only — `global.css` imported by `BaseLayout` |

## Rules

- Components are dumb: they receive props and render. No fetching, no domain logic.
- Client-side interactivity lives in `<script>` blocks in `pages/index.astro`, not scattered across components.
- Icons are inline SVG — no icon font libraries, no external CDN.
- CSS is colocated: each component imports its own `.css` file from the same directory (e.g. `Hero.astro` imports `./hero.css`).
- `lib/failure-http.ts` is the single source of truth for mapping `Failure` → HTTP status and message. Never redeclare `isFailure`, `statusFor`, or `messageFor` inline.
- Palette colors and shape kinds must always be imported from `domain/value-objects/`. Never hardcode hex values or shape name strings in components or scripts.
- Every page must use `BaseLayout` — never write `<!doctype html>` or `<head>` manually in a page file.
