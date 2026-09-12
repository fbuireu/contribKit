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
| [`pages/index.astro`](https://github.com/fbuireu/contribKit/blob/main/web/src/pages/index.astro) | Landing page: SSR initial render + client interactivity |
| [`pages/api/contributions.ts`](https://github.com/fbuireu/contribKit/blob/main/web/src/pages/api/contributions.ts) | `GET /api/contributions?user=&year=` |
| [`pages/api/health.ts`](https://github.com/fbuireu/contribKit/blob/main/web/src/pages/api/health.ts) | `GET /api/health` |
| `pages/user/[username].svg.ts` | `GET /user/:username.svg` |
| [`pages/404.astro`](https://github.com/fbuireu/contribKit/blob/main/web/src/pages/404.astro), [`500.astro`](https://github.com/fbuireu/contribKit/blob/main/web/src/pages/500.astro) | Error pages (shared `ErrorView`) |
| [`pages/legal-notice.astro`](https://github.com/fbuireu/contribKit/blob/main/web/src/pages/legal-notice.astro), [`privacy.astro`](https://github.com/fbuireu/contribKit/blob/main/web/src/pages/privacy.astro), [`terms.astro`](https://github.com/fbuireu/contribKit/blob/main/web/src/pages/terms.astro) | Static legal pages |

All dynamic routes set `prerender = false`. Pages are the composition root: they instantiate infrastructure and use cases **once at module scope**, validate input with Zod + domain value objects, call the use case, and map any `Failure` to an HTTP response via `statusFor`/`messageFor`. No business logic lives in pages. See **[API Reference](API-Reference)**.

### Input validation per route

| Route | Validation |
|-------|------------|
| `/api/contributions` | Zod schema requires `user` (min 1), optional `year`; then `parseUsername` + `parseYear` |
| `/user/:username.svg` | `parseUsername(params.username)`; `palette`/`shape` fall back to defaults, `background` is regex-checked (`transparent`, hex, or CSS color name) then defaulted |

Unknown `palette`/`shape`/`background` values silently fall back to defaults via Zod `.catch()`, so the SVG never errors on bad options; only an invalid **username** produces a 4xx.

---

## Middleware

[`src/middleware.ts`](https://github.com/fbuireu/contribKit/blob/main/web/src/middleware.ts) runs on every request and does three things:

1. **Blocking the agent guide:** `/CLAUDE` gets a bare `404` before anything else runs. Astro compiles [`src/pages/CLAUDE.md`](https://github.com/fbuireu/contribKit/blob/main/web/src/pages/CLAUDE.md) into a public page, and this is what keeps it off the web ([ADR 0018](https://github.com/fbuireu/ContribKit/blob/main/docs/adr/0018-src-pages-is-a-public-namespace-not-a-folder.md)).
2. **Rate limiting:** for `/api/*` paths, it reads the `API_RATE_LIMITER` binding and calls `limit({ key })` keyed on `CF-Connecting-IP`. Over the limit, it returns `429` with `Retry-After: 60` (still wrapped in the security headers).
3. **Security headers:** every response is re-wrapped with a strict header set:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
  https://www.googletagmanager.com https://betterstack.net
  https://static.cloudflareinsights.com; style-src 'self'
  'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data:; connect-src 'self' https://*.google-analytics.com
  https://analytics.google.com https://*.analytics.google.com https://www.googletagmanager.com
  https://betterstack.net https://*.betterstackdata.com https://cloudflareinsights.com;
  worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
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

Both deploys run from [`ci.yml`](https://github.com/fbuireu/contribKit/blob/main/.github/workflows/ci.yml), only after `Verify (web)` (`pnpm verify`: format check, typecheck, `astro check` and coverage) passes:

- **Production:** every push to `main` that the `changes` job counts as a web change builds with `CLOUDFLARE_ENV=production`, then `wrangler deploy --env production` → worker `contribkit` on `contribkit.app`. That set covers `shared/`, `docs/`, `scripts/`, root `*.md`, the root config files and the whole of `.github/` as well as `web/`, so a documentation-only push redeploys too; see **[CI/CD](CI-CD)** for why.
- **Development:** every PR counted the same way builds with `CLOUDFLARE_ENV=development` and deploys an ephemeral worker `pr-<n>-contribkit-development` on `*.workers.dev`; the PR gets a comment with the URL, and the worker is deleted when the PR closes.

> **`@astrojs/cloudflare` gotcha:** two switches choose the environment and the deploy sets both. `CLOUDFLARE_ENV=<env> astro build` decides which `wrangler.toml` `[env.NAME]` block the adapter flattens into `dist/server/wrangler.json`; `wrangler deploy --env <env>` decides which block the deploy itself selects, and `--name` overrides the Worker name for a preview. Setting only the first is what once shipped the bare top level, leaving the custom domain and the rate-limit binding in the file and out of the Worker. A mismatched pair fails loudly rather than quietly: wrangler compares the flag with the generated config's `targetEnvironment` and reports `This does not match the target environment "production"`.

See **[CI/CD](CI-CD)** for the full pipeline.

---

## Environment variables

All BetterStack/GA vars are build-time (`import.meta.env`, Vite-inlined).

| Variable | Type | Used by |
|----------|------|---------|
| `PUBLIC_GOOGLE_ANALYTICS_ID` | build-time | GA (browser) |
| `PUBLIC_BETTER_STACK_TRACKING_TOKEN` | build-time | Better Stack browser tag (RUM), from the app's Frontend tab |
| `API_RATE_LIMITER` | runtime binding | rate limiter |

Hit [`/api/health`](https://contribkit.app/api/health) to verify which vars/bindings the deployed worker has (presence only, never values).

---

## Observability

- **Server logs:** `logger` writes one JSON line per 5xx failure and unhandled 500 through `console`; Cloudflare exports it.
- **Worker telemetry:** Cloudflare observability (logs + traces, full head sampling), per env in `wrangler.toml`.
- **Export:** Cloudflare ships both logs and traces to Better Stack over OTLP, named as `destinations` in `wrangler.toml`.
- **Browser RUM + analytics:** Better Stack telemetry and GA4, loaded only after cookie consent.

---

## See also

- **[Architecture](Architecture)** · **[Fetching Contributions](Fetching-Contributions)** · **[SVG Rendering](SVG-Rendering)**
