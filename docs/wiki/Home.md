# :green_square: ContribKit

**Visualize, customize, and export your GitHub contribution calendar with custom palettes, shapes, and backgrounds. No token required.**

ContribKit turns any public GitHub profile into a fully customizable contribution calendar you can pin, embed, or carry on your home screen. It runs as a web app and public API on Cloudflare Workers, and as a native iOS & Android app with home-screen widgets, both sharing a single set of design tokens.

---

## What It Does

- Reads GitHub's **public** contributions page for any username, with no API token, OAuth, or private data
- Parses it into a `date` / `level` / `count` model and builds a 53×7 calendar grid
- Renders a customizable calendar as **SVG** (web/API), **PNG**, or **Markdown** (app)
- Offers **11 color palettes**, **5 cell shapes**, and configurable backgrounds
- Exposes a **live SVG endpoint** you can drop straight into a README
- Ships a **mobile app** with daily-refreshed home-screen widgets

---

## Quick Navigation

| Page | Description |
|------|-------------|
| **[Getting Started](Getting-Started)** | Render your first calendar, embed it, install the app |
| **[How It Works](How-It-Works)** | Request lifecycle, data pipeline, rendering |
| **[API Reference](API-Reference)** | Endpoints, query params, response formats |
| **[Architecture](Architecture)** | DDD-ish layers, value objects, typed failures |
| **[Project Structure](Project-Structure)** | Monorepo layout: web, app, shared tokens |
| **[Web Application](Web-Application)** | Astro on Cloudflare Workers: dev, deploy, env |
| **[Mobile App](Mobile-App)** | Flutter app, widgets, in-app purchases |
| **[Fetching Contributions](Fetching-Contributions)** | The GitHub HTML scraping repository |
| **[HTML Parsing](HTML-Parsing)** | Regex extraction of cells and tooltips |
| **[Calendar Grid](Calendar-Grid)** | Building the deterministic 53×7 grid |
| **[SVG Rendering](SVG-Rendering)** | Geometry, shapes, and the string renderer |
| **[Deterministic Randomness](Mulberry32)** | The Mulberry32 PRNG used for placeholder grids |
| **[Git Hooks](Git-Hooks)** | lefthook, commitlint, auto-scope, asset sync |
| **[CI/CD](CI-CD)** | Path-filtered workflows, environments, releases |
| **[Troubleshooting](Troubleshooting)** | Common issues and fixes |

---

## Key Features

### Customization

- **11 palettes:** GitHub, Catppuccin, Nord, Dracula, Gruvbox, Sunset, Tokyo Night, One Dark, Rosé Pine, Solarized, Monokai
- **5 cell shapes:** rounded, square, circle, dot, hex
- **Backgrounds:** transparent, any hex color, or a CSS color name
- **Year selector:** any year back to 2005 (GitHub's launch)

### Platforms

- **Web app + API:** Astro + TypeScript on Cloudflare Workers
- **iOS & Android:** one Flutter codebase, with platform-respecting home-screen widgets
- **README embed:** a one-line Markdown snippet that always shows your latest calendar

### Engineering highlights

- **Token-free by design:** reads GitHub's public contributions page; no API key, OAuth, or PAT anywhere in the stack
- **One architecture, two platforms:** the same DDD-ish layering (`domain` → `application` → `infrastructure`/`ui`) in TypeScript and Dart, with pure domains, validated value objects at every boundary, and typed `Failure` unions (nothing throws across layers)
- **Edge rendering:** SVG generated as a pure string inside a Cloudflare Worker (no DOM, no canvas), so output is deterministic and cacheable
- **Single source of truth:** palettes/shapes/usernames defined once in `shared/`, consumed by both apps and auto-synced into the Flutter bundle
- **Fully automated delivery:** per-component CI with path filters, per-PR preview Workers, semantic-release versioning, and **automatic Google Play shipping** (signed AAB + Play release notes generated from the changelog)
- **Hardened pipelines:** SHA-pinned actions, least-privilege permissions, zizmor workflow scanning, dependency auto-merge

See **[Architecture](Architecture)**, **[CI/CD](CI-CD)**, and **[Git Hooks](Git-Hooks)** for the details.

---

## Minimal Embed

```markdown
![contributions](https://contribkit.app/user/YOUR_USERNAME.svg)
```

With options:

```markdown
![contributions](https://contribkit.app/user/YOUR_USERNAME.svg?palette=catppuccin&shape=hex&background=transparent)
```

See **[Getting Started](Getting-Started)** for the full walkthrough.

---

## Links

- **Website:** [contribkit.app](https://contribkit.app)
- **Google Play:** [com.fbuireu.contribkit](https://play.google.com/store/apps/details?id=com.fbuireu.contribkit) (App Store soon)
- **Source:** [github.com/fbuireu/ContribKit](https://github.com/fbuireu/ContribKit)

---

## License

[MIT](https://github.com/fbuireu/ContribKit/blob/main/LICENSE). Made by [Ferran Buireu](https://github.com/fbuireu). ContribKit is not affiliated with GitHub, Inc.
