<div align="center">

<img src="web/public/logo.svg" alt="ContribKit logo" width="96" height="96">

# ContribKit

**Visualize, customize, and export your GitHub contribution calendar: custom palettes, shapes, and backgrounds. No token required. Available on the web and as an iOS & Android app, with home-screen widgets on Android.**

[![CI](https://img.shields.io/github/actions/workflow/status/fbuireu/contribkit/ci.yml?style=flat-square&logo=github&label=CI)](https://github.com/fbuireu/contribkit/actions/workflows/ci.yml)
[![Codecov](https://img.shields.io/codecov/c/gh/fbuireu/contribkit?style=flat-square&logo=codecov)](https://codecov.io/gh/fbuireu/contribkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

**[Website](https://contribkit.app)** · **[Google Play](https://play.google.com/store/apps/details?id=com.fbuireu.contribkit)** · **App Store (soon)** · **[Web docs](web/README.md)** · **[App docs](app/README.md)**

</div>

---

## Table of Contents

- [What You Get](#what-you-get)
- [Features](#features)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Monorepo Development](#monorepo-development)
- [Documentation](#documentation)
- [Support & Contributing](#support--contributing)
- [Use of AI](#use-of-ai)

---

## What You Get

Type a GitHub username and get a fully customizable contribution calendar you can pin, embed, or carry on your home screen:

- **Live SVG endpoint**: this image is rendered by ContribKit right now:

  <img src="https://contribkit.app/user/torvalds.svg" alt="torvalds' GitHub contributions rendered by ContribKit" width="800">

- **[Web app](https://contribkit.app):** render any profile, tweak palette and shape, and export as PNG, SVG, or Markdown.
- **[Mobile app](https://play.google.com/store/apps/details?id=com.fbuireu.contribkit):** native iOS & Android app, with Android home-screen widgets that keep your streak one glance away.
- **README embed:** a one-line Markdown snippet that always shows your up-to-date calendar.

---

## Features

- 🎨 **11 color palettes:** GitHub, Catppuccin, Nord, Dracula, Gruvbox, Sunset, Tokyo Night, One Dark, Rosé Pine, Solarized, Monokai
- 🔷 **5 cell shapes:** rounded, square, circle, dot, hex
- 📤 **3 export formats:** PNG for the readme, SVG for the portfolio, Markdown for the bio
- 🔓 **No token required:** only public contribution data; no OAuth, no PAT
- 📱 **Home-screen widgets:** small (streak counter) and medium (grid, streak and total); Android only, refreshed daily
- 🗓️ **Year selector:** any year back to 2005
- 🌗 **Dark/light theme:** follows your system scheme, with manual override
- 🧩 **Shared design tokens:** palettes defined once in [`shared/`](shared) and read by both apps; shapes are shared with the web only (see [ADR 0002](docs/adr/0002-shared-design-tokens-mirrored-into-the-flutter-bundle.md))

---

## Quick Start

### Web

1. Open **[contribkit.app](https://contribkit.app)**
2. Type a GitHub username and hit **render**
3. Customize, then copy or export from the **export** section

### Mobile

1. Install from **[Google Play](https://play.google.com/store/apps/details?id=com.fbuireu.contribkit)** (App Store coming soon)
2. Enter your username
3. On Android, add the widget to your home screen

### README

```markdown
![contributions](https://contribkit.app/user/YOUR_USERNAME.svg)
```

See the **[embedding guide](web/README.md#embedding-in-your-readme)** for palettes, shapes, and background options.

---

## Project Structure

Monorepo with three components sharing design tokens:

| Directory                    | Component                                               | Stack                                     | Docs                            |
| ---------------------------- | ------------------------------------------------------- | ----------------------------------------- | ------------------------------- |
| [`web/`](web)                | [contribkit.app](https://contribkit.app) + SVG/JSON API | Astro · TypeScript · Cloudflare Workers | **[web/README.md](web/README.md)** |
| [`app/`](app)                | iOS & Android app, Android home-screen widgets          | Flutter · Riverpod · RevenueCat           | **[app/README.md](app/README.md)** |
| [`shared/`](shared)          | Single source of truth for palettes, shapes, usernames  | JSON consumed by both apps                | **[shared/README.md](shared/README.md)** |

Both apps follow the same DDD-ish layered architecture (`domain` → `application` → `infrastructure` / `ui`): the domain is pure, validated value objects guard every boundary, errors are a sealed set of typed `Failure`s matched exhaustively at the boundary (returned as values on the web, thrown and caught in the app), and each layer documents its own rules in a colocated `CLAUDE.md`.

Both apps also share one vocabulary: **[CONTEXT.md](CONTEXT.md)** is the domain glossary, and **[docs/adr/](docs/adr)** records the decisions behind the architecture.

---

## Monorepo Development

Tooling that applies to the whole repo:

- **Package manager:** pnpm workspaces ([`pnpm-workspace.yaml`](pnpm-workspace.yaml))
- **Git hooks:** [lefthook](https://github.com/evilmartians/lefthook) ([`lefthook.yml`](lefthook.yml)). Install once with `brew install lefthook && lefthook install`
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org), enforced by commitlint
- **Releases:** semantic-release per component (`web-vX.Y.Z` / `app-vX.Y.Z` tags)
- **CI:** one [`ci.yml`](.github/workflows/ci.yml) on every push and pull request, with no path filter. A `changes` job decides which client was touched and every other job is gated on its output, so an app-only pull request skips the web jobs rather than never starting them. The documentation-consistency contract runs ungated, because it asserts things about both clients and the root

GitHub Environments are namespaced by component (`<component>-<stage>`) because they are repo-global and hold component-specific secrets:

| GitHub Environment | Component   | Stage       | Deployed by                                       |
| ------------------ | ----------- | ----------- | ------------------------------------------------- |
| `app-production`   | Flutter app | production  | [`release-app.yml`](./.github/workflows/release-app.yml) (track = production)            |
| `app-development`  | Flutter app | development | `release-app.yml` (track ≠ production)            |
| `web-production`   | Astro web   | production  | [`ci.yml`](./.github/workflows/ci.yml) (deploy-production, push to `main`)      |
| `web-development`  | Astro web   | development | `ci.yml` (deploy-development, per-PR preview)     |

App `development` and web `development` map to different things: app `development` is the internal Play track + RevenueCat sandbox; web `development` is a per-PR preview Worker on `*.workers.dev`. The component-scoped configs do **not** repeat the prefix: wrangler uses `[env.production]` / `[env.development]`; Flutter has no build flavors: locally the stage is whichever dart-defines file you pass (`dart-defines.prod.json` vs `dart-defines.json`), and in CI it is the `track` input to `release-app.yml`, which picks the GitHub Environment whose `REVENUECAT_KEY` is written into `dart-defines.json` at build time.

Component-specific setup, commands, and deploy flows live in **[web/README.md](web/README.md)** and **[app/README.md](app/README.md)**.

---

## Documentation

| Guide                                              | Description                                                  |
| --------------------------------------------------- | ------------------------------------------------------------ |
| **[Architecture](ARCHITECTURE.md)**                 | The layer map both clients share, a request end to end, build and release |
| **[Contributing](CONTRIBUTING.md)**                 | Setup, the checks, commit rules, and how a change gets released |
| **[Domain glossary](CONTEXT.md)**                   | The canonical name for every domain concept, and the ones to avoid |
| **[Web](web/README.md)**                            | API reference, embedding guide, architecture, deploys        |
| **[App](app/README.md)**                            | Flutter setup, widgets, in-app purchases, releases           |
| **[Shared tokens](shared/README.md)**              | Palettes, shapes, and usernames consumed by both apps        |
| **[Legal notice](https://contribkit.app/legal-notice)** | [Privacy](https://contribkit.app/privacy) · [Terms](https://contribkit.app/terms) |

The user-facing guides are published as the repository wiki:

| Page | Covers |
| ------ | -------- |
| **[Getting Started](../../wiki/Getting-Started)** | Viewing, embedding, installing the app, running it locally |
| **[How It Works](../../wiki/How-It-Works)** | End-to-end flow, from a username to a rendered calendar |
| **[API Reference](../../wiki/API-Reference)** | The SVG and JSON endpoints, parameters, caching, errors |
| **[Web Application](../../wiki/Web-Application)** | Routes, headers, environments, the Cloudflare deploy |
| **[Mobile App](../../wiki/Mobile-App)** | Build configuration, home-screen widgets, tips |
| **[Architecture](../../wiki/Architecture)** | Layers, value objects, entities, failures |
| **[Project Structure](../../wiki/Project-Structure)** | Where every directory lives and what owns it |
| **[Fetching Contributions](../../wiki/Fetching-Contributions)** | How the public page is requested, and what can go wrong |
| **[HTML Parsing](../../wiki/HTML-Parsing)** | The regexes, and why there is no DOM parser |
| **[Calendar Grid](../../wiki/Calendar-Grid)** | Building the fixed 53×7 grid deterministically |
| **[SVG Rendering](../../wiki/SVG-Rendering)** | Geometry, labels, shapes, and the emitted attributes |
| **[Deterministic Randomness](../../wiki/Mulberry32)** | The seeded PRNG behind the placeholder grids |
| **[CI/CD](../../wiki/CI-CD)** | Both pipelines, environments, and Play delivery |
| **[Git Hooks](../../wiki/Git-Hooks)** | What lefthook runs, and when |
| **[Troubleshooting](../../wiki/Troubleshooting)** | Common failures and what they actually mean |

For *why* it is built this way (one decision per file), see the [architecture decision records](docs/adr), indexed in [ARCHITECTURE.md](ARCHITECTURE.md#7-where-things-live).

---

## Support & Contributing

- **[Report bugs](../../issues/new?template=bug_report.yml)**
- **[Request features](../../issues/new?template=feature_request.yml)**
- **[Report a vulnerability](https://github.com/fbuireu/contribKit/security/advisories/new)** privately, never as an issue
- **[Improve documentation](../../issues/new?template=documentation.yml)**

If you find this project useful, consider supporting its development:

<p align="center">
  <a href="https://github.com/sponsors/fbuireu">
    <img src="https://img.shields.io/badge/Sponsor-fbuireu-pink?style=for-the-badge&logo=github-sponsors" alt="Sponsor">
  </a>
  <a href="https://www.buymeacoffee.com/ferranbuireu">
    <img src="https://img.shields.io/badge/Buy%20Me%20A%20Beer-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me A Beer">
  </a>
</p>

---

## Use of AI

This project uses AI assistance primarily for documentation and review purposes. AI tools (GitHub Copilot, Claude) were used to:

- Write and improve documentation (READMEs, layer `CLAUDE.md` files)
- Generate boilerplate code and configuration files
- Assist with code reviews and refactoring suggestions

The core logic, architecture decisions, and implementation were developed by the maintainer. All AI-generated content has been reviewed and validated.

ContribKit is not affiliated with GitHub, Inc.

---

<div align="center">

[MIT](LICENSE) © Made with 🤘🏼 by [Ferran Buireu](https://github.com/fbuireu)

</div>

