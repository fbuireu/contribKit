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
| `GET /api/contributions?user=&year=` | `application/json` | Contribution Days as `days` (`date`, `level`, `count`) plus yearly total |
| `POST /api/contact`                  | `application/json` | Sends a Contact Message as email through Cloudflare Email Routing; body `{ name?, email, message, website? }` |
| `GET /api/health`                    | `application/json` | Deployment health: env vars/bindings presence (never values)             |

- **Caching.** A calendar from either data route is `public, max-age=3600, stale-while-revalidate=86400`; **every failure is `no-store`**, as is every answer of `/api/contact` and `/api/health`; and the landing page is `private` whatever happens: an hour when the visitor named someone and the calendar loaded, `no-store` otherwise. Behind all of them, the Worker's own request to GitHub is held in Cloudflare's cache for an hour (`cf.cacheTtl`), which never shows in a response header. The [How It Works](https://github.com/fbuireu/contribKit/wiki/How-It-Works#caching-three-layers) wiki page draws the three layers.
- **Rate limiting.** Only `/api/*`, per IP: 100 req/min on every path but `/api/contact`, which, whatever the method, has its own bucket at **5 req/min** because it protects a mailbox rather than an upstream. `/user/:username.svg` is deliberately not rate-limited, because README embeds reach it through GitHub's shared image proxy ([ADR 0010](../docs/adr/0010-rate-limit-only-the-json-api.md)).
- **The contact endpoint holds no secret.** It sends through the `CONTACT_EMAIL` `send_email` binding, from `contact@contribkit.app` to the mailbox the `MAINTAINER_EMAIL` build-time variable names, refuses anything that fills its honeypot field with a silent `202`, answers `502` when Email Routing refuses the send, and `500` when the deployment has no `CONTACT_EMAIL` binding at all ([ADR 0030](../docs/adr/0030-contact-messages-leave-through-cloudflares-send-email-binding.md)).
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
  layout: dagre
---
flowchart TD
    request(["request"]) --> middleware["middleware: a per-IP limit on /api/*, security headers on every answer"]
    middleware --> page["GET /: rendered on the Worker, then page-init in the browser"]
    middleware --> json["GET /api/contributions: the raw days, as JSON"]
    middleware --> svg["GET /user/name.svg: the Rolling Window, drawn as an SVG string"]
    middleware --> contact["POST /api/contact: an email, through the send_email binding"]
    page --> load["loadContributions"]
    json --> load
    svg --> load
    load --> github["GitHub's public contributions page, through Cloudflare's cache, parsed into Contribution Days"]
```

ContribKit reads GitHub's **public** contributions page: no API token, no OAuth scopes, no private data. Each route takes its own path from there: the landing page renders the Year's grid on the Worker and hands the same days to the browser, the JSON route returns the days without building a grid, and the SVG route draws the Rolling Window. Errors are typed domain `Failure`s mapped to HTTP statuses at the boundary, with one throw: the contact repository throws when the `CONTACT_EMAIL` binding is missing, and the route answers that, like anything else unexpected, with a `no-store` 500. Each flow, its failures and its caching are on the [How It Works](https://github.com/fbuireu/contribKit/wiki/How-It-Works) wiki page.

---

## Architecture

DDD-ish layers. The rules are in [`CODING_STANDARDS.md`](../CODING_STANDARDS.md), and each layer has a colocated `AGENTS.md` for whoever works in it:

| Layer                                                  | Role                                                            |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| **[domain](src/domain/AGENTS.md)**                     | Pure business core: value objects, entities, failures, geometry |
| **[application](src/application/AGENTS.md)**           | Curried use cases and `Failure` → HTTP mapping                  |
| **[infrastructure](src/infrastructure/AGENTS.md)**     | GitHub scraping, SVG string renderer, email delivery, logging    |
| **[ui](src/ui/AGENTS.md)**                             | Astro components, client interactivity, styles                  |
| **[ui/components](src/ui/components/AGENTS.md)**       | Component groups, colocation and error-page rules               |
| **[pages](src/pages/AGENTS.md)**                       | Routes: the only layer that wires everything together            |

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
| `pnpm test:ut`           | Vitest unit tests                           |
| `pnpm test:ut:coverage`  | the same, with the coverage floor           |
| `pnpm test:docs`         | the documentation-consistency contract alone |
| `pnpm test:e2e`          | Playwright e2e tests, in Chromium and WebKit |
| `pnpm lint:all`          | Biome lint                                  |
| `pnpm check`             | `astro check` (Astro diagnostics)           |
| `pnpm typecheck`         | wrangler types + astro sync + `tsc --noEmit` |
| `pnpm format:all`        | Biome format (write)                        |
| `pnpm format:check`      | Biome format check (read-only)              |
| `pnpm verify`            | format check, typecheck, `astro check` and the coverage run: the checks CI runs, as parallel steps |
| `pnpm verify:changed`    | the same without the coverage floor, over the tests touched since `origin/main`, plus the docs contract: what `pre-push` runs |

### Local environment

The build reads its variables from the environment, and Astro also loads them from a `.env` file in this folder, which is gitignored. Start from the example:

```bash
cp .env.example .env
```

`MAINTAINER_EMAIL` and `PUBLIC_GOOGLE_ANALYTICS_ID` are required by the `astro:env` schema in [`astro.config.ts`](./astro.config.ts): without them `pnpm build` fails, and `pnpm dev` starts but answers every request with Astro's *environment variables … are invalid* error. Any value does locally. `PUBLIC_BETTER_STACK_TRACKING_TOKEN` is optional. `SITE_URL` falls back to `https://contribkit.app`, and `astro.config.ts` reads it from the shell's environment rather than from `.env`, so export it to change it. The rate limiters and `CONTACT_EMAIL` are Cloudflare bindings declared in [`wrangler.toml`](./wrangler.toml), not variables, so no `.env` sets them.

---

## Environments & Deploys

Both deploys run from [`ci.yml`](../.github/workflows/ci.yml), behind `Verify (web)`, which runs the checks of `pnpm verify` in this package as parallel steps:

- **Production**: every push to `main` that touched the web set builds with `CLOUDFLARE_ENV=production`, then `wrangler deploy --env production` → worker `contribkit` on `contribkit.app`. Decoupled from semantic-release (which only versions).
- **Development**: every PR that touched it builds with `CLOUDFLARE_ENV=development` and deploys an ephemeral worker `pr-<n>-contribkit-development` (`wrangler deploy --env development --name …`) on `*.workers.dev`; the PR gets a comment with the URL, and the worker is deleted when the PR closes.

> [!NOTE]
> **That set is decided by a job, not by a `paths:` filter**, and the difference is the point: a filtered workflow reports nothing on a pull request outside its paths, so a check that has to be required cannot live behind one. `ci.yml` carries no filter; a `changes` job diffs the range and every other job is gated on its output by `if:`. The web set is `web/`, `shared/`, `scripts/`, `docs/`, any root `*.md`, the root [`package.json`](../package.json), `pnpm-workspace.yaml`, `pnpm-lock.yaml`, [`lefthook.yml`](../lefthook.yml), `.nvmrc` and the whole of `.github/`. A documentation-only push to `main` therefore redeploys the Worker, which is accepted because the deploy is idempotent. The documentation-consistency contract needs none of this: `Docs Contract` is its own job with no gate at all, so it fires on every event whatever changed ([ADR 0015](../docs/adr/0015-the-maintenance-contract-is-enforced-by-a-test.md)).

> [!IMPORTANT]
> **How environments work with `@astrojs/cloudflare`:** there are two switches and both are set. `CLOUDFLARE_ENV=<env> astro build` is Astro's, and decides which [`wrangler.toml`](./wrangler.toml) `[env.NAME]` block the adapter resolves into `dist/server/wrangler.json`; `wrangler deploy --env <env>` is wrangler's, and decides which block the deploy selects. [`_deploy.yml`](../.github/workflows/_deploy.yml) derives one stage name from the GitHub Environment and passes it to both, with `--name` on top for previews. Without the second, the bindings that live solely under `[env.production]`, the custom domain and the `API_RATE_LIMITER` and `CONTACT_RATE_LIMITER` limits, would never reach the Worker. A mismatched pair is not silent: wrangler compares the flag with the generated config's `targetEnvironment` and fails with *This does not match the target environment*.

See the **[root README](../README.md#monorepo-development)** for the GitHub Environments naming convention shared with the app.

---

## Environment Variables

All BetterStack/GA vars are build-time (`import.meta.env`, Vite-inlined), and the Better Stack token is the browser's alone: the server logger sends nothing itself, it writes to `console` and Cloudflare exports the logs over OTLP ([Observability](#observability)), so the Worker holds no Better Stack secret at all.

| Variable                            | Type            | Used by                                     | Where it lives                  |
| ----------------------------------- | --------------- | -------------------------------------------- | ------------------------------- |
| `PUBLIC_GOOGLE_ANALYTICS_ID`        | build-time      | GA (browser)                                 | GitHub Environment **variable** |
| `PUBLIC_BETTER_STACK_TRACKING_TOKEN` | build-time     | Better Stack browser tag (RUM), from the app's **Frontend** tab | GitHub Environment **variable** |
| `API_RATE_LIMITER`                  | runtime binding | rate limiter for every `/api/` path but `/api/contact` | `wrangler.toml` per env         |
| `CONTACT_RATE_LIMITER`              | runtime binding | rate limiter for `/api/contact`              | `wrangler.toml` per env         |
| `CONTACT_EMAIL`                     | runtime binding | `send_email`, sending from `contact@contribkit.app` | `wrangler.toml`, top level and per env |
| `MAINTAINER_EMAIL`               | build-time      | the verified mailbox a Contact Message is delivered to; required by the `astro:env` schema, so a build without it fails, an unset GitHub variable included, since Astro reads its empty string as missing | GitHub **repository variable** |
| `SITE_URL`                          | build-time      | the site's origin (`site` in `astro.config.ts`, and the smoke run's base URL); falls back to `https://contribkit.app` | GitHub **repository variable** |

Hit [`/api/health`](https://contribkit.app/api/health) to verify which vars/bindings the deployed worker was built/configured with (presence only, never values).

---

## Observability

- **Server logs:** [`logger`](src/infrastructure/logging/logger.ts) writes one JSON line per 5xx failure and unhandled 500 through `console`. It sends nothing itself; Cloudflare exports it.
- **Worker telemetry:** Cloudflare observability, configured per env in [`wrangler.toml`](wrangler.toml): logs and traces at full head sampling, query strings redacted, both exported over OTLP to per-stage destinations (`contribkit-web-production-logs` / `-traces` in production, a `-development` pair for the preview Workers, so pull-request traffic stays out of the production source). Traces instrument handlers, outbound `fetch` and bindings with no code, and the exported log records carry the trace id, so a log line and its span are one query ([ADR 0026](../docs/adr/0026-observability-is-cloudflares-exported-to-better-stack.md)). The destinations themselves live in the Cloudflare dashboard, not in this repository: nothing here fails if one is renamed.
- **Browser RUM:** Better Stack telemetry and GA4, loaded only after cookie consent.
- **Usage Events:** the browser records a closed set of named events, each with properties drawn from closed sets and never the Username or free text, sent to GA4 and Better Stack only after each one's consent; the full list is in the wiki under [Web Application](../../wiki/Web-Application#usage-events).
