# Web Application

The web component (`web/`) is [contribkit.app](https://contribkit.app) plus the public SVG/JSON API. It's an Astro + TypeScript app deployed to Cloudflare Workers via `@astrojs/cloudflare`.

---

## Development

```bash
pnpm install
cd web
```

The command table lives in [`web/README.md`](https://github.com/fbuireu/ContribKit/blob/main/web/README.md#development)
and is not repeated here: the copy that used to sit in this page had already lost `pnpm format:check`, which is
the one command CI actually runs.

---

## Routes

| File | Route |
|------|-------|
| [`pages/index.astro`](../../web/src/pages/index.astro) | Landing page: SSR initial render + client interactivity |
| [`pages/api/contributions.ts`](../../web/src/pages/api/contributions.ts) | `GET /api/contributions?user=&year=` |
| [`pages/api/health.ts`](../../web/src/pages/api/health.ts) | `GET /api/health` |
| `pages/user/[username].svg.ts` | `GET /user/:username.svg` |
| [`pages/404.astro`](../../web/src/pages/404.astro), [`500.astro`](../../web/src/pages/500.astro) | Error pages (shared `ErrorView`) |
| [`pages/legal-notice.astro`](../../web/src/pages/legal-notice.astro), [`privacy.astro`](../../web/src/pages/privacy.astro), [`terms.astro`](../../web/src/pages/terms.astro) | Static legal pages |

All dynamic routes set `prerender = false`. Pages are the composition root: they instantiate infrastructure and use cases **once at module scope**, validate input with Zod + domain value objects, call the use case, and map any `Failure` to an HTTP response via `statusFor`/`messageFor`. No business logic lives in pages. See **[API Reference](API-Reference)**.

### Input validation per route

| Route | Validation |
|-------|------------|
| `/api/contributions` | Zod schema requires `user` (min 1), optional `year`; then `parseUsername` + `parseYear` |
| `/user/:username.svg` | `parseUsername(params.username)`; `palette`/`shape` fall back to defaults, `background` is regex-checked (`transparent`, hex, or CSS color name) then defaulted |

Unknown `palette`/`shape`/`background` values silently fall back to defaults via Zod `.catch()`, so the SVG never errors on bad options; only an invalid **username** produces a 4xx.

---

## Middleware

[`src/middleware.ts`](../../web/src/middleware.ts) runs on every request and does three things:

1. **Blocking the agent guide:** `/CLAUDE` gets a bare `404` before anything else runs. Astro compiles [`src/pages/CLAUDE.md`](../../web/src/pages/CLAUDE.md) into a public page, and this is what keeps it off the web ([ADR 0018](https://github.com/fbuireu/ContribKit/blob/main/docs/adr/0018-src-pages-is-a-public-namespace-not-a-folder.md)).
2. **Rate limiting:** for `/api/*` paths, it reads the `API_RATE_LIMITER` binding and calls `limit({ key })` keyed on `CF-Connecting-IP`. Over the limit, it returns `429` with `Retry-After: 60` (still wrapped in the security headers).
3. **Security headers:** every response is re-wrapped with a strict header set:

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
Cross-Origin-Embedder-Policy: unsafe-none
```

`/user/:username.svg` overrides the resource policy to `cross-origin` so the calendar embeds on any site; every other route keeps `same-origin`. See **[API Reference](API-Reference)**.

---

## Environments & deploys

Both deploys run from [`ci.yml`](../../.github/workflows/ci.yml), only after `Verify (web)` (`pnpm verify`: format check, typecheck, `astro check` and coverage) passes:

- **Production:** every push to `main` matching the workflow's path filter builds with `CLOUDFLARE_ENV=production`, then `wrangler deploy` → worker `contribkit` on `contribkit.app`. That filter covers `shared/**`, `docs/**`, `scripts/**`, `*.md`, the three root config files and the workflow's own wiring as well as `web/**`, so a documentation-only push redeploys too; see **[CI/CD](CI-CD)** for why.
- **Development:** every PR matching the same filter builds with `CLOUDFLARE_ENV=development` and deploys an ephemeral worker `pr-<n>-contribkit-development` on `*.workers.dev`; the PR gets a comment with the URL, and the worker is deleted when the PR closes.

> **`@astrojs/cloudflare` gotcha:** the adapter flattens the `wrangler.toml` `[env.NAME]` block at build time into `dist/server/wrangler.json`. Select it with `CLOUDFLARE_ENV=<env> astro build`, then deploy with a plain `wrangler deploy` (use `--name` for previews). Do not pass `wrangler deploy --env <env>` on top of it. The generated config carries a `targetEnvironment`, and wrangler checks the flag against it: matching is a byte-for-byte no-op (`--dry-run` with and without `--env production` prints identical output, same Worker name, same bindings), and mismatching is a hard error (`This does not match the target environment "production"`). So the flag can only be redundant or fatal, never quietly wrong. `_deploy-web.yml` carried it until this was executed rather than assumed; it is gone.

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
