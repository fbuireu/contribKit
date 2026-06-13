# Web Application

The web component (`web/`) is [contribkit.app](https://contribkit.app) plus the public SVG/JSON API. It's an Astro + TypeScript app deployed to Cloudflare Workers via `@astrojs/cloudflare`.

---

## Development

```bash
pnpm install
cd web
```

| Command | Action |
|---------|--------|
| `pnpm dev` | Local dev server (generates wrangler types) |
| `pnpm wrangler:dev` | Build + run under the Workers runtime |
| `pnpm build` | Production build |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright e2e tests |
| `pnpm lint:all` | Biome lint |
| `pnpm lint:astro` | `astro check` (Astro diagnostics) |
| `pnpm lint:ts:typecheck` | `tsc --noEmit` |
| `pnpm format:all` | Biome format (write) |

---

## Routes

| File | Route |
|------|-------|
| `pages/index.astro` | Landing page — SSR initial render + client interactivity |
| `pages/api/contributions.ts` | `GET /api/contributions?user=&year=` |
| `pages/api/health.ts` | `GET /api/health` |
| `pages/user/[username].svg.ts` | `GET /user/:username.svg` |
| `pages/404.astro`, `500.astro` | Error pages (shared `ErrorView`) |
| `pages/legal-notice.astro`, `privacy.astro`, `terms.astro` | Static legal pages |

All dynamic routes set `prerender = false`. Pages are the composition root: they instantiate infrastructure and use cases **once at module scope**, validate input with Zod + domain value objects, call the use case, and map any `Failure` to an HTTP response via `statusFor`/`messageFor`. No business logic lives in pages. See **[API Reference](API-Reference)**.

### Input validation per route

| Route | Validation |
|-------|------------|
| `/api/contributions` | Zod schema requires `user` (min 1), optional `year`; then `parseUsername` + `parseYear` |
| `/user/:username.svg` | `parseUsername(params.username)`; `palette`/`shape` fall back to defaults, `background` is regex-checked (`transparent`, hex, or CSS color name) then defaulted |

Unknown `palette`/`shape`/`background` values silently fall back to defaults via Zod `.catch()`, so the SVG never errors on bad options — only an invalid **username** produces a 4xx.

---

## Middleware

`src/middleware.ts` runs on every request and does two things:

1. **Rate limiting** — for `/api/*` paths, it reads the `API_RATE_LIMITER` binding and calls `limit({ key })` keyed on `CF-Connecting-IP`. Over the limit, it returns `429` with `Retry-After: 60` (still wrapped in the security headers).
2. **Security headers** — every response is re-wrapped with a strict header set:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
  https://www.googletagmanager.com https://cdn.betterstack.com; style-src 'self'
  'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data:; connect-src 'self' https://www.google-analytics.com
  https://analytics.google.com https://cdn.betterstack.com; frame-ancestors 'none';
  base-uri 'self'; form-action 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

---

## Environments & deploys

Both deploys run from `ci-web.yml`, only after `web-check` (lint + test) and `web-build` (build + typecheck) pass:

- **Production** — every push to `main` touching `web/**` builds with `CLOUDFLARE_ENV=production`, then `wrangler deploy` → worker `contribkit` on `contribkit.app`.
- **Development** — every PR touching `web/**` builds with `CLOUDFLARE_ENV=development` and deploys an ephemeral worker `pr-<n>-contribkit-development` on `*.workers.dev`; the PR gets a comment with the URL, and the worker is deleted when the PR closes.

> **`@astrojs/cloudflare` gotcha:** the adapter flattens the `wrangler.toml` `[env.NAME]` block at build time into `dist/server/wrangler.json`. Select it with `CLOUDFLARE_ENV=<env> astro build`, then deploy with a plain `wrangler deploy` (use `--name` for previews). **Do not** use `wrangler deploy --env <env>` — the generated config is already flattened, so `--env` is ignored and per-env routes/ratelimits/observability are silently dropped.

See **[CI/CD](CI-CD)** for the full pipeline.

---

## Environment variables

All BetterStack/GA vars are build-time (`import.meta.env`, Vite-inlined).

| Variable | Type | Used by |
|----------|------|---------|
| `PUBLIC_GOOGLE_ANALYTICS_ID` | build-time | GA (browser) |
| `PUBLIC_BETTER_STACK_SOURCE_TOKEN` | build-time | BetterStack RUM (browser) + logger (server) |
| `PUBLIC_BETTER_STACK_INGESTING_URL` | build-time | BetterStack logger endpoint (server) |
| `API_RATE_LIMITER` | runtime binding | rate limiter |

Hit [`/api/health`](https://contribkit.app/api/health) to verify which vars/bindings the deployed worker has (presence only, never values).

---

## Observability

- **Server logs:** Better Stack via `better-stack-logger` (5xx failures and unhandled 500s).
- **Worker telemetry:** Cloudflare observability (logs + traces, 20% head sampling), per env in `wrangler.toml`.
- **Tail worker:** `workers/tail` forwards Worker logs and exceptions to Better Stack.
- **Browser RUM + analytics:** Better Stack telemetry and GA4, loaded only after cookie consent.

---

## See also

- **[Architecture](Architecture)** · **[Fetching Contributions](Fetching-Contributions)** · **[SVG Rendering](SVG-Rendering)**
