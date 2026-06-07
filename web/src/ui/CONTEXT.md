# ui/

Presentation layer. Astro components, client-side interactivity, shared utilities, and styles. Depends on `domain/` and `application/`. Never imports from `infrastructure/` or `pages/`.

## Layout

| Directory | Contents |
|---|---|
| `components/` | All Astro components — features, app shell (`core/`), the contribution grid, error pages, icons. See `components/CONTEXT.md`. |
| `utils/` | Shared TypeScript utilities used across features and pages: PRNG (`mulberry`), `crypto`, `failure-http` (`Failure` → HTTP), `log-server-error`, and `page-init` (the client page controller). |
| `styles/` | Global CSS layered with `@layer` — `index.css` is the entry imported by `BaseLayout`. |

## Rules

- Components are dumb: they receive props and render. No fetching, no domain logic.
- CSS is colocated: each component imports its own `.css` from the same folder.
- Icons are inline SVG — no icon font libraries, no external CDN.
- `utils/failure-http.ts` is the single source of truth for mapping `Failure` → HTTP status and message. Never redeclare `isFailure`, `statusFor`, or `messageFor` inline.
- Palette colors and shape kinds must always be imported from `domain/value-objects/`. Never hardcode hex values or shape name strings.
- Every page must use `BaseLayout` — never write `<!doctype html>` or `<head>` manually in a page file.
