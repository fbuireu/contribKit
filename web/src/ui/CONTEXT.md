# ui/

Presentation layer. Astro components, client-side interactivity, shared utilities, and styles. Depends on `domain/` and `application/`. Never imports from `infrastructure/` or `pages/`.

## Layout

| Directory | Contents |
|---|---|
| `components/` | Astro components — one per UI section |
| `components/icons/` | Inline SVG icon components — no external icon library |
| `lib/` | Shared TypeScript utilities used by components and pages |
| `styles/` | Global CSS and per-component CSS files imported by their owner component |

## Rules

- Components are dumb: they receive props and render. No fetching, no domain logic.
- Client-side interactivity lives in `<script>` blocks in `pages/index.astro`, not scattered across components.
- Icons are inline SVG — no icon font libraries, no external CDN.
- CSS is component-scoped: each component imports its own file from `styles/components/`.
- `lib/failure-http.ts` is the single source of truth for mapping `Failure` → HTTP status and message. Never redeclare `isFailure`, `statusFor`, or `messageFor` inline.
- Palette colors and shape kinds must always be imported from `domain/value-objects/`. Never hardcode hex values or shape name strings in components or scripts.
