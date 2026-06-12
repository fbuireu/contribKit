<div align="center">

<img src="web/public/logo.svg" alt="ContribKit logo" width="96" height="96">

# ContribKit

**Visualize, customize, and export your GitHub contribution calendar — custom palettes, shapes, and backgrounds. No token required. Available on the web, iOS & Android, with home-screen widgets.**

[![CI Web](https://img.shields.io/github/actions/workflow/status/fbuireu/contribkit/ci-web.yml?style=flat-square&logo=github&label=CI%20Web)](https://github.com/fbuireu/contribkit/actions/workflows/ci-web.yml)
[![CI App](https://img.shields.io/github/actions/workflow/status/fbuireu/contribkit/ci-app.yml?style=flat-square&logo=github&label=CI%20App)](https://github.com/fbuireu/contribkit/actions/workflows/ci-app.yml)
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

- **Live SVG endpoint** — this image is rendered by ContribKit right now:

  <img src="https://contribkit.app/user/torvalds.svg" alt="torvalds' GitHub contributions rendered by ContribKit" width="800">

- **[Web app](https://contribkit.app):** render any profile, tweak palette and shape, and export as PNG, SVG, or Markdown.
- **[Mobile app](https://play.google.com/store/apps/details?id=com.fbuireu.contribkit):** native iOS & Android app with home-screen widgets that keep your streak one glance away.
- **README embed:** a one-line Markdown snippet that always shows your up-to-date calendar.

---

## Features

- 🎨 **11 color palettes:** GitHub, Catppuccin, Nord, Dracula, Gruvbox, Sunset, Tokyo Night, One Dark, Rosé Pine, Solarized, Monokai
- 🔷 **5 cell shapes:** rounded, square, circle, dot, hex
- 📤 **3 export formats:** PNG for the readme, SVG for the portfolio, Markdown for the bio
- 🔓 **No token required:** only public contribution data — no OAuth, no PAT
- 📱 **Home-screen widgets:** small (streak counter), medium (full grid), large (both) — iOS & Android, refreshed daily
- 🗓️ **Year selector:** any year back to 2005 (GitHub's launch)
- 🌗 **Dark/light theme:** follows your system scheme, with manual override
- 🧩 **Shared design tokens:** palettes and shapes defined once in [`shared/`](shared), used by web and app

---

## Quick Start

### Web

1. Open **[contribkit.app](https://contribkit.app)**
2. Type a GitHub username and hit **render**
3. Customize, then copy or export from the **export** section

### Mobile

1. Install from **[Google Play](https://play.google.com/store/apps/details?id=com.fbuireu.contribkit)** (App Store coming soon)
2. Enter your username
3. Add the widget to your home screen

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
| [`app/`](app)                | iOS & Android app with home-screen widgets              | Flutter · Riverpod · RevenueCat           | **[app/README.md](app/README.md)** |
| [`shared/`](shared)          | Single source of truth for palettes, shapes, usernames  | JSON consumed by both apps                | **[shared/CONTEXT.md](shared/CONTEXT.md)** |

Both apps follow the same DDD-ish layered architecture (`domain` → `application` → `infrastructure` / `ui`): the domain is pure, validated value objects guard every boundary, errors are typed `Failure`s (nothing throws across layers), and each layer documents its own rules in a colocated `CONTEXT.md`.

---

## Monorepo Development

Tooling that applies to the whole repo:

- **Package manager:** pnpm workspaces ([`pnpm-workspace.yaml`](pnpm-workspace.yaml))
- **Git hooks:** [lefthook](https://github.com/evilmartians/lefthook) ([`lefthook.yml`](lefthook.yml)) — install once with `brew install lefthook && lefthook install`
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org), enforced by commitlint
- **Releases:** semantic-release per component (`web-vX.Y.Z` / `app-vX.Y.Z` tags)
- **CI:** path-filtered workflows — [`ci-web.yml`](.github/workflows/ci-web.yml) and [`ci-app.yml`](.github/workflows/ci-app.yml) only run when their component changes

GitHub Environments are namespaced by component (`<component>-<stage>`) because they are repo-global and hold component-specific secrets:

| GitHub Environment | Component   | Stage       | Deployed by                                       |
| ------------------ | ----------- | ----------- | ------------------------------------------------- |
| `app-production`   | Flutter app | production  | `release-app.yml` (track = production)            |
| `app-development`  | Flutter app | development | `release-app.yml` (track ≠ production)            |
| `web-production`   | Astro web   | production  | `ci-web.yml` (deploy-production, push to `main`)  |
| `web-development`  | Astro web   | development | `ci-web.yml` (deploy-development, per-PR preview) |

App `development` and web `development` map to different things: app `development` is the internal Play track + RevenueCat sandbox; web `development` is a per-PR preview Worker on `*.workers.dev`. The component-scoped configs do **not** repeat the prefix: wrangler uses `[env.production]` / `[env.development]`; Flutter uses `production` / `development` flavors.

Component-specific setup, commands, and deploy flows live in **[web/README.md](web/README.md)** and **[app/README.md](app/README.md)**.

---

## Documentation

| Guide                                              | Description                                                  |
| --------------------------------------------------- | ------------------------------------------------------------ |
| **[Web](web/README.md)**                            | API reference, embedding guide, architecture, deploys        |
| **[App](app/README.md)**                            | Flutter setup, widgets, in-app purchases, releases           |
| **[Shared tokens](shared/CONTEXT.md)**              | Palettes, shapes, and usernames consumed by both apps        |
| **[Legal notice](https://contribkit.app/legal-notice)** | [Privacy](https://contribkit.app/privacy) · [Terms](https://contribkit.app/terms) |

---

## Support & Contributing

- **[Report bugs](../../issues/new?template=bug_report.yml)**
- **[Request features](../../issues/new?template=feature_request.yml)**
- **[Report security issues](../../issues/new?template=security_report.yml)**
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

- Write and improve documentation (READMEs, layer `CONTEXT.md` files)
- Generate boilerplate code and configuration files
- Assist with code reviews and refactoring suggestions

The core logic, architecture decisions, and implementation were developed by the maintainer. All AI-generated content has been reviewed and validated.

ContribKit is not affiliated with GitHub, Inc.

---

<div align="center">

[MIT](LICENSE) © Made with 🤘🏼 by [Ferran Buireu](https://github.com/fbuireu)

</div>
