# ContribKit 

[![CI Web](https://github.com/fbuireu/contribkit/actions/workflows/ci-web.yml/badge.svg)](https://github.com/fbuireu/contribkit/actions/workflows/ci-web.yml)
[![CI App](https://github.com/fbuireu/contribkit/actions/workflows/ci-app.yml/badge.svg)](https://github.com/fbuireu/contribkit/actions/workflows/ci-app.yml)
[![codecov](https://codecov.io/gh/fbuireu/contribkit/branch/main/graph/badge.svg)](https://codecov.io/gh/fbuireu/contribkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Visualize and export your GitHub contribution calendar with full visual customization — custom palettes, gradients, shapes, and backgrounds. Export as PNG, SVG, or Markdown.

## Running locally

```bash
flutter run --dart-define=REVENUE_CAT
```

Generate a token at [github.com/settings/tokens](https://github.com/settings/tokens) with no scopes required (public data only).

## Development

```bash
# Install dependencies
flutter pub get

# Install lefthook (once, globally) and activate git hooks
brew install lefthook   # or: npm i -g @evilmartians/lefthook
lefthook install

# Watch for code generation changes
dart run build_runner watch --delete-conflicting-outputs

# Run tests
flutter test --coverage

# Analyze
flutter analyze
```

## Environments

GitHub Environments are namespaced by component (`<component>-<stage>`) because they are repo-global and hold component-specific secrets:

| GitHub Environment | Component | Stage | Deployed by |
|---|---|---|---|
| `app-production` | Flutter app | production | `release-app.yml` (track = production) |
| `app-development` | Flutter app | development | `release-app.yml` (track ≠ production) |
| `web-production` | Astro web | production | `ci-web.yml` (deploy-production, push to `main`) |
| `web-development` | Astro web | development | `ci-web.yml` (deploy-development, per-PR preview) |

App `development` and web `development` map to different things: app `development` is the internal Play track + RevenueCat sandbox; web `development` is a per-PR preview Worker on `*.workers.dev`.

The component-scoped configs do **not** repeat the prefix: wrangler uses `[env.production]` / `[env.development]`; Flutter uses `production` / `development` flavors.

### Web deploy flow

Both deploys run from `ci-web.yml` and only after `web-check` (lint + test) and `web-build` (build + typecheck) pass:

- **Production**: every push to `main` touching `web/**` runs `wrangler deploy --env production` → worker `contribkit` on `contribkit.app`. Decoupled from semantic-release (which only versions).
- **Development**: every PR touching `web/**` deploys an ephemeral worker `pr-<n>-contribkit-development` on `*.workers.dev`; the PR gets a comment with the URL, and the worker is deleted when the PR closes.

### Environment variables

All BetterStack/GA vars are build-time (`import.meta.env`, Vite-inlined). The BetterStack source token is the same for browser RUM and the server logger; since the browser already exposes it, a single public var is used for both — no separate runtime secret.

| Variable | Type | Used by | Where it lives |
|---|---|---|---|
| `PUBLIC_GOOGLE_ANALYTICS_ID` | build-time | GA (browser) | GitHub Environment **variable** |
| `PUBLIC_BETTER_STACK_TOKEN` | build-time | BetterStack RUM (browser) + logger (server) | GitHub Environment **variable** |
| `PUBLIC_BETTER_STACK_INGESTING_URL` | build-time | BetterStack logger endpoint (server) | GitHub Environment **variable** |
| `API_RATE_LIMITER` | runtime binding | rate limiter | `wrangler.toml` per env |

Hit `/api/health` to verify which vars/bindings the deployed worker was built/configured with (presence only, never values).
