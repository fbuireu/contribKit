# ui/components/error/

Error-state UI for the `404` and `500` pages. Both pages render the **same**
`ErrorView`, driven entirely by props, so they stay in lockstep — the layout is
the Astro port of the `claude.ai/design` handoff (`ErrorPage` + `ErrorGrid`).

## Contents

| File | Role | Purpose |
|---|---|---|
| `ContributionCode.astro` | atom | Draws a status code (`404`/`500`) as a glowing contribution grid: 5×7 pixel glyphs lit from the palette, sine-noise ambient scatter around them. Pure SSR SVG, deterministic (seeded), no client JS. Colors/glow come from the `--grid-*` tokens. |
| `ErrorView.astro` | organism | Full error body — glow + grid texture background, the grid hero, mono eyebrow (`GET <path> → <code>`), title, message, a terminal `render.log` block with a blinking cursor, and two actions (primary back/retry + ghost "Report issue"). Dropped inside `BaseLayout` by each page. |

## Rules

- Components are dumb: they receive props and render. Each page builds its own
  eyebrow/terminal copy from `Astro.url.pathname`, never fetched here.
- `ErrorView`/`ContributionCode` are generic over the code + tone; `404.astro` and
  `500.astro` reuse the exact same components — do not fork a second copy.
- Tone switching is token-only: `.error-page.is-danger` remaps `--grid-*`/`--err-accent`
  to the red ramp. Green path uses the `--contrib-*` + `--accent` tokens. Never inline hex
  in the components.
- Report link deep-links to the **bug** template (`/issues/new?template=bug_report.yml`),
  pre-selecting it instead of landing on the chooser.
