# ui/components/

Every Astro component lives here, grouped by role. CSS and component-specific logic/tests are colocated in each folder.

## Layout

| Directory | Role |
|---|---|
| `core/` | App shell + head plumbing on every page: `layouts/` (`BaseLayout`), `header/`, `footer/`, `seo/`, `analytics/`, `cookie-consent/`. |
| `hero/` · `customize/` · `export/` · `how-it-works/` · `widget/` | Home-page feature sections — one folder each (`.astro` + `.css` + any local logic). |
| `grid/` | The contribution graph: `CellTip` + its rendering utils (`calendar`, `render-svg`, `mini-grid`, `contribution`). |
| `error/` | The `404`/`500` UI — `ErrorView` + `ContributionCode` + `glyph-utils`, generic over code + tone. |
| `icons/` | Inline SVG icon components — no external icon library. |
| `legal/` | Shared styles for the legal pages. |

## Rules

- Components are dumb: props in, markup out. No fetching, no domain logic — client interactivity lives in `utils/page-init.ts`, not scattered across components.
- CSS is colocated: each component imports its own `.css` from the same folder (e.g. `Hero.astro` → `./hero.css`).
- `core/` renders on every page; `BaseLayout` composes `header` + `footer` + the head integrations (`seo`, `analytics`, `cookie-consent`).
- **error/**: `404.astro` and `500.astro` render the **same** `ErrorView`/`ContributionCode` driven entirely by props — never fork a second copy. Tone is token-only (`.error-page.is-danger` remaps `--grid-*`/`--error-*` to the red ramp); never inline hex.
- Palette colors and shape kinds come from `domain/value-objects/` — never hardcode hex or shape strings.
