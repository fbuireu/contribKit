<div align="center">

<img src="public/logo.svg" alt="ContribKit logo" width="96" height="96">

# ContribKit · Web

**The [contribkit.app](https://contribkit.app) site and public API: Astro + TypeScript on Cloudflare Workers.**

[![CI](https://img.shields.io/github/actions/workflow/status/fbuireu/contribkit/ci.yml?style=flat-square&logo=github&label=CI)](https://github.com/fbuireu/contribkit/actions/workflows/ci.yml)
[![Codecov](https://img.shields.io/codecov/c/gh/fbuireu/contribkit?style=flat-square&logo=codecov)](https://codecov.io/gh/fbuireu/contribkit)

**[Project overview](../README.md)** · **[Website](https://contribkit.app)** · **[App docs](../app/README.md)**

</div>

---

## Table of Contents

- [Embedding in Your README](#embedding-in-your-readme)
- [API](#api)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Development](#development)
- [Environments & Deploys](#environments--deploys)
- [Environment Variables](#environment-variables)
- [Observability](#observability)

---

## Embedding in Your README

### Basic

```markdown
![contributions](https://contribkit.app/user/YOUR_USERNAME.svg)
```

### With options

```markdown
![contributions](https://contribkit.app/user/YOUR_USERNAME.svg?palette=catppuccin&shape=hex&background=transparent)
```

<details>
<summary><strong>All query parameters</strong></summary>

| Parameter    | Default       | Values                                                                                                                      |
| ------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `palette`    | `github`      | `github`, `catppuccin`, `nord`, `dracula`, `gruvbox`, `sunset`, `tokyonight`, `onedark`, `rosepine`, `solarized`, `monokai` |
| `shape`      | `rounded`     | `rounded`, `square`, `circle`, `dot`, `hex`                                                                                  |
| `background` | `transparent` | `transparent`, any hex color (`#101010`), or a CSS color name                                                                |

Unknown values silently fall back to the default, so the image never breaks.

</details>

---

## API

| Endpoint                             | Returns            | Description                                                              |
| ------------------------------------ | ------------------ | ------------------------------------------------------------------------ |
| `GET /user/:username.svg`            | `image/svg+xml`    | Rendered calendar; accepts `palette`, `shape`, `background` query params |
| `GET /api/contributions?user=&year=` | `application/json` | Contribution Days as `days` (`date`, `level`, `count`) plus yearly total; `cells` is a deprecated alias for the same array |
| `GET /api/health`                    | `application/json` | Deployment health: env vars/bindings presence (never values)             |

- **Caching.** Both data responses are `public, max-age=3600, stale-while-revalidate=86400`.
- **Rate limiting.** Only `/api/*`, per IP, at 100 req/min. `/user/:username.svg` is deliberately not, because README embeds reach it through GitHub's shared image proxy ([ADR 0010](../docs/adr/0010-rate-limit-only-the-json-api.md)).
- **Backing off.** A `429` carries `Retry-After` in seconds whenever a wait is known (`60` from our own limiter, GitHub's own figure when GitHub is the one throttling), and no header at all when it is not, rather than a guess.
- **Security headers.** Set by the [middleware](src/middleware.ts) on every server-rendered response, including the CSP.
- **The one exemption.** The SVG route, and only that route, is served `Cross-Origin-Resource-Policy: cross-origin` so the calendar embeds outside GitHub ([ADR 0017](../docs/adr/0017-the-svg-endpoint-opts-out-of-the-same-origin-resource-policy.md)).
- **Static assets never reach that middleware.** Workers Assets answers them before the Worker runs, so `public/_headers` carries `X-Content-Type-Options`, `Referrer-Policy` and `X-Frame-Options` for them. The Cloudflare adapter merges its own `/_astro/*` `Cache-Control` rule into that file rather than replacing it.

---

## How It Works

```mermaid
---
config:
  look: handDrawn
---
flowchart TD
    request(["Request"])
    middleware["Middleware: rate limit + security headers"]
    validate["Validate input (Zod + value objects)"]
    usecase["Use case: fetchContributions"]
    scrape["Fetch GitHub contributions HTML"]
    parse["Parse Contribution Days (date, level, count)"]
    grid["Build 53×7 calendar grid"]
    render["Render SVG (palette, shape, background)"]
    respond["Response + cache headers"]

    request --> middleware --> validate --> usecase --> scrape --> parse --> grid --> render --> respond

    style request stroke:#1565c0,stroke-width:3px
    style middleware stroke:#e65100,stroke-width:3px
    style validate stroke:#e65100,stroke-width:3px
    style usecase stroke:#7b1fa2,stroke-width:3px
    style scrape stroke:#7b1fa2,stroke-width:3px
    style parse stroke:#7b1fa2,stroke-width:3px
    style grid stroke:#2e7d32,stroke-width:3px
    style render stroke:#2e7d32,stroke-width:3px
    style respond stroke:#c2185b,stroke-width:3px
```

ContribKit reads GitHub's **public** contributions page: no API token, no OAuth scopes, no private data. Errors are typed domain `Failure`s mapped to HTTP statuses at the boundary; nothing throws across layers.

---

## Architecture

DDD-ish layers; each one documents its own rules in a colocated `CLAUDE.md`:

| Layer                                                  | Role                                                            |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| **[domain](src/domain/CLAUDE.md)**                     | Pure business core: value objects, entities, failures, geometry |
| **[application](src/application/CLAUDE.md)**           | Curried use cases and `Failure` → HTTP mapping                  |
| **[infrastructure](src/infrastructure/CLAUDE.md)**     | GitHub scraping, SVG string renderer, logging                   |
| **[ui](src/ui/CLAUDE.md)**                             | Astro components, client interactivity, styles                  |
| **[ui/components](src/ui/components/CLAUDE.md)**       | Component groups, colocation and error-page rules               |
| **[pages](src/pages/CLAUDE.md)**                       | Routes: the only layer that wires everything together            |

---

## Development

```bash
pnpm install
```

| Command                  | Action                                      |
| ------------------------ | ------------------------------------------- |
| `pnpm dev`               | Local dev server (generates wrangler types) |
| `pnpm wrangler:dev`      | Build + run under the Workers runtime       |
| `pnpm build`             | Production build                            |
| `pnpm test`              | Vitest unit tests                           |
| `pnpm test:e2e`          | Playwright e2e tests                        |
| `pnpm lint:all`          | Biome lint                                  |
| `pnpm check`             | `astro check` (Astro diagnostics)           |
| `pnpm lint:ts:typecheck` | `tsc --noEmit`                              |
| `pnpm format:all`        | Biome format (write)                        |
| `pnpm format:check`      | Biome format check (read-only, runs in CI)  |

---

## Environments & Deploys

Both deploys run from [`ci.yml`](../.github/workflows/ci.yml), behind `Verify (web)`, which is `pnpm verify` in this package:

- **Production**: every push to `main` that touched the web set builds with `CLOUDFLARE_ENV=production`, then `wrangler deploy --env production` → worker `contribkit` on `contribkit.app`. Decoupled from semantic-release (which only versions).
- **Development**: every PR that touched it builds with `CLOUDFLARE_ENV=development` and deploys an ephemeral worker `pr-<n>-contribkit-development` (`wrangler deploy --env development --name …`) on `*.workers.dev`; the PR gets a comment with the URL, and the worker is deleted when the PR closes.

> [!NOTE]
> **That set is decided by a job, not by a `paths:` filter**, and the difference is the point: a filtered workflow reports nothing on a pull request outside its paths, so a check that has to be required cannot live behind one. `ci.yml` carries no filter; a `changes` job diffs the range and every other job is gated on its output by `if:`. The web set is `web/`, `shared/`, `scripts/`, `docs/`, any root `*.md`, the root [`package.json`](../package.json), `pnpm-workspace.yaml`, `pnpm-lock.yaml`, [`lefthook.yml`](../lefthook.yml), `.nvmrc` and the whole of `.github/`. A documentation-only push to `main` therefore redeploys the Worker, which is accepted because the deploy is idempotent. The documentation-consistency contract needs none of this: `Docs Contract` is its own job with no gate at all, so it fires on every event whatever changed ([ADR 0015](../docs/adr/0015-the-maintenance-contract-is-enforced-by-a-test.md)).

> [!IMPORTANT]
> **How environments work with `@astrojs/cloudflare`:** there are two switches and both are set. `CLOUDFLARE_ENV=<env> astro build` is Astro's, and decides which [`wrangler.toml`](./wrangler.toml) `[env.NAME]` block the adapter resolves into `dist/server/wrangler.json`; `wrangler deploy --env <env>` is wrangler's, and decides which block the deploy selects. [`_deploy.yml`](../.github/workflows/_deploy.yml) derives one stage name from the GitHub Environment and passes it to both, with `--name` on top for previews. It passed only the first for a long while, and the bindings that live solely under `[env.production]`, the custom domain and the `API_RATE_LIMITER` limit, never reached the Worker; the root [`CLAUDE.md`](../CLAUDE.md) has the whole account. A mismatched pair is not silent: wrangler compares the flag with the generated config's `targetEnvironment` and fails with *This does not match the target environment*.

See the **[root README](../README.md#monorepo-development)** for the GitHub Environments naming convention shared with the app.

---

## Environment Variables

All BetterStack/GA vars are build-time (`import.meta.env`, Vite-inlined). The BetterStack source token is the same for browser RUM and the server logger; since the browser already exposes it, a single public var is used for both: no separate runtime secret.

| Variable                            | Type            | Used by                                     | Where it lives                  |
| ----------------------------------- | --------------- | -------------------------------------------- | ------------------------------- |
| `PUBLIC_GOOGLE_ANALYTICS_ID`        | build-time      | GA (browser)                                 | GitHub Environment **variable** |
| `PUBLIC_BETTER_STACK_TRACKING_TOKEN` | build-time     | Better Stack browser tag (RUM), from the app's **Frontend** tab | GitHub Environment **variable** |
| `API_RATE_LIMITER`                  | runtime binding | rate limiter                                 | `wrangler.toml` per env         |

Hit [`/api/health`](https://contribkit.app/api/health) to verify which vars/bindings the deployed worker was built/configured with (presence only, never values).

---

## Observability

- **Server logs:** [`logger`](src/infrastructure/logging/logger.ts) writes one JSON line per 5xx failure and unhandled 500 through `console`. It sends nothing itself; Cloudflare exports it.
- **Worker telemetry:** Cloudflare observability, configured per env in [`wrangler.toml`](wrangler.toml): logs and traces at full head sampling, query strings redacted, both exported over OTLP to per-stage destinations (`contribkit-web-production-logs` / `-traces` in production, a `-development` pair for the preview Workers, so pull-request traffic stays out of the production source). Traces instrument handlers, outbound `fetch` and bindings with no code, and the exported log records carry the trace id, so a log line and its span are one query ([ADR 0026](../docs/adr/0026-observability-is-cloudflares-exported-to-better-stack.md)). The destinations themselves live in the Cloudflare dashboard, not in this repository: nothing here fails if one is renamed.
- **Browser RUM + analytics:** Better Stack telemetry and GA4, loaded only after cookie consent.
