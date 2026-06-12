<div align="center">

<img src="public/logo.svg" alt="ContribKit logo" width="96" height="96">

# ContribKit · Web

**The [contribkit.app](https://contribkit.app) site and public API — Astro + TypeScript on Cloudflare Workers.**

[![CI Web](https://img.shields.io/github/actions/workflow/status/fbuireu/contribkit/ci-web.yml?style=flat-square&logo=github&label=CI%20Web)](https://github.com/fbuireu/contribkit/actions/workflows/ci-web.yml)
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
| `GET /api/contributions?user=&year=` | `application/json` | Raw contribution cells (`date`, `level`, `count`) plus yearly total      |
| `GET /api/health`                    | `application/json` | Deployment health: env vars/bindings presence (never values)             |

Data responses are cached with `public, max-age=3600, stale-while-revalidate=86400` and rate-limited per IP (100 req/min). Every response carries CSP and security headers set by the [middleware](src/middleware.ts).

---

## How It Works

```mermaid
---
config:
  look: handDrawn
  theme: neutral
---
flowchart TD
    request(["Request"])
    middleware["Middleware: rate limit + security headers"]
    validate["Validate input (Zod + value objects)"]
    usecase["Use case: fetchContributions"]
    scrape["Fetch GitHub contributions HTML"]
    parse["Parse cells (date, level, count)"]
    grid["Build 53×7 calendar grid"]
    render["Render SVG (palette, shape, background)"]
    respond["Response + cache headers"]

    request --> middleware --> validate --> usecase --> scrape --> parse --> grid --> render --> respond

    style request fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    style middleware fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style validate fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style usecase fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style scrape fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style parse fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style grid fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    style render fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    style respond fill:#fce4ec,stroke:#880e4f,stroke-width:2px
```

ContribKit reads GitHub's **public** contributions page — no API token, no OAuth scopes, no private data. Errors are typed domain `Failure`s mapped to HTTP statuses at the boundary; nothing throws across layers.

---

## Architecture

DDD-ish layers; each one documents its own rules in a colocated `CONTEXT.md`:

| Layer                                                  | Role                                                            |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| **[domain](src/domain/CONTEXT.md)**                     | Pure business core: value objects, entities, failures, geometry |
| **[application](src/application/CONTEXT.md)**           | Curried use cases and `Failure` → HTTP mapping                  |
| **[infrastructure](src/infrastructure/CONTEXT.md)**     | GitHub scraping, SVG string renderer, logging                   |
| **[ui](src/ui/CONTEXT.md)**                             | Astro components, client interactivity, styles                  |
| **[ui/components](src/ui/components/CONTEXT.md)**       | Component groups, colocation and error-page rules               |
| **[pages](src/pages/CONTEXT.md)**                       | Routes — the only layer that wires everything together          |

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
| `pnpm lint:astro`        | `astro check` (Astro diagnostics)           |
| `pnpm lint:ts:typecheck` | `tsc --noEmit`                              |
| `pnpm format:all`        | Biome format (write)                        |

---

## Environments & Deploys

Both deploys run from [`ci-web.yml`](../.github/workflows/ci-web.yml) and only after `web-check` (lint + test) and `web-build` (build + typecheck) pass:

- **Production**: every push to `main` touching `web/**` builds with `CLOUDFLARE_ENV=production` then `wrangler deploy` → worker `contribkit` on `contribkit.app`. Decoupled from semantic-release (which only versions).
- **Development**: every PR touching `web/**` builds with `CLOUDFLARE_ENV=development` and deploys an ephemeral worker `pr-<n>-contribkit-development` (`wrangler deploy --name …`) on `*.workers.dev`; the PR gets a comment with the URL, and the worker is deleted when the PR closes.

> [!IMPORTANT]
> **How environments work with `@astrojs/cloudflare`:** the adapter resolves the `wrangler.toml` `[env.NAME]` block **at build time** into `dist/server/wrangler.json`. You select it with `CLOUDFLARE_ENV=<env> astro build`, then deploy with a plain `wrangler deploy` (and `--name` for previews). **Do not** use `wrangler deploy --env <env>` — the adapter-generated config is already flattened, so `--env` is ignored and per-env routes/ratelimits/observability are silently dropped.

See the **[root README](../README.md#monorepo-development)** for the GitHub Environments naming convention shared with the app.

---

## Environment Variables

All BetterStack/GA vars are build-time (`import.meta.env`, Vite-inlined). The BetterStack source token is the same for browser RUM and the server logger; since the browser already exposes it, a single public var is used for both — no separate runtime secret.

| Variable                            | Type            | Used by                                     | Where it lives                  |
| ----------------------------------- | --------------- | -------------------------------------------- | ------------------------------- |
| `PUBLIC_GOOGLE_ANALYTICS_ID`        | build-time      | GA (browser)                                 | GitHub Environment **variable** |
| `PUBLIC_BETTER_STACK_SOURCE_TOKEN`  | build-time      | BetterStack RUM (browser) + logger (server)  | GitHub Environment **variable** |
| `PUBLIC_BETTER_STACK_INGESTING_URL` | build-time      | BetterStack logger endpoint (server)         | GitHub Environment **variable** |
| `API_RATE_LIMITER`                  | runtime binding | rate limiter                                 | `wrangler.toml` per env         |

Hit [`/api/health`](https://contribkit.app/api/health) to verify which vars/bindings the deployed worker was built/configured with (presence only, never values).

---

## Observability

- **Server logs:** Better Stack via [`better-stack-logger`](src/infrastructure/logging/better-stack-logger.ts) (5xx failures and unhandled 500s).
- **Worker telemetry:** Cloudflare observability (logs + traces, 20% head sampling) configured per env in [`wrangler.toml`](wrangler.toml).
- **Tail worker:** [`workers/tail`](workers/tail/index.ts) forwards Worker logs and exceptions to Better Stack.
- **Browser RUM + analytics:** Better Stack telemetry and GA4, loaded only after cookie consent.
