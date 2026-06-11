# pages/

Astro pages and API routes. The only layer that wires together `application/`, `infrastructure/`, and `ui/`. Entry points for all HTTP traffic.

## Layout

| File / Dir | Contents |
|---|---|
| `index.astro` | Landing page — SSR initial render + client-side interactivity |
| `api/contributions.ts` | `GET /api/contributions?user=&year=` — returns JSON |
| `user/[username].svg.ts` | `GET /user/:username.svg` — returns SVG image |
| `privacy.astro`, `terms.astro` | Static legal pages |

## Rules

- Validate all external input (query params, route params) with Zod before passing to the domain.
- Map `Failure` to HTTP responses exclusively via `application/http/failure-http.ts` (`statusFor`, `messageFor`) and guard with `isFailure` from `domain/failures/failure.ts`. Never inline them.
- `prerender = false` on all dynamic routes.
- Cache headers: `public, max-age=3600, stale-while-revalidate=86400` on all data responses.
- Pages are the composition root: they instantiate infrastructure, call use cases, and pass results to components. No business logic lives here.
