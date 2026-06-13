# Project Structure

ContribKit is a pnpm-workspace monorepo with three components that share design tokens.

```
ContribKit/
├── web/        Astro + TypeScript on Cloudflare Workers (contribkit.app + API)
├── app/        Flutter iOS & Android app with home-screen widgets
├── shared/     Single source of truth: palettes, shapes, usernames (JSON)
├── scripts/    Repo tooling (e.g. sync-shared-assets.mjs)
└── .github/    CI/CD workflows
```

| Directory | Component | Stack |
|-----------|-----------|-------|
| `web/` | contribkit.app + SVG/JSON API | Astro · TypeScript · Cloudflare Workers |
| `app/` | iOS & Android app with widgets | Flutter · Riverpod · RevenueCat |
| `shared/` | Palettes, shapes, usernames | JSON consumed by both apps |

---

## `web/src`

```
domain/
  value-objects/   Username, Year, ContributionLevel, Palette, ShapeKind, calendar-labels
  entities/        ContributionDay, ContributionCalendar (types.ts)
  repositories/    ContributionsRepository (interface only)
  services/        calendar-grid, svg-geometry, cell-shapes, dates, SvgRenderer type
  failures/        Failure union + constructors + isFailure
application/
  use-cases/       fetchContributions, renderCalendarSvg, loadInitialContributions
  http/            failure-http (statusFor, messageFor)
infrastructure/
  github/          createGithubHtmlContributionsRepository (HTML scraping)
  rendering/       svgStringRenderer
  logging/         better-stack-logger, logServerError
ui/
  components/      Astro components (core/, grid/, error/, icons/, features…)
  utils/           page-init, render/state, roving, url/cookie, mulberry, …
  styles/          @layer-based global CSS
pages/
  index.astro      landing page (SSR + client interactivity)
  api/             contributions.ts, health.ts
  user/            [username].svg.ts
  404.astro, 500.astro, legal-notice/privacy/terms
middleware.ts      rate limiting + security headers
```

Most layers carry a colocated `CONTEXT.md` documenting their rules. See **[Architecture](Architecture)** and **[Web Application](Web-Application)**.

---

## `app/lib`

```
domain/          Entities, value objects, repository interfaces, services, failures
application/     Use cases (fetch, export, tips)
infrastructure/  GitHub repo, asset repos, export (png/svg/markdown), persistence, purchases
ui/              Features (viewer, customizer, export, tip), widgets, theme, DI
```

See **[Mobile App](Mobile-App)**.

---

## `shared/` — design tokens

The single source of truth for data used by both apps:

| File | Contents |
|------|----------|
| `palettes.json` | 11 color palettes (5 levels each) |
| `shapes.json` | 5 cell shapes |
| `usernames.json` | Suggested usernames |

> **Edit the JSON here — never edit the copies under `app/assets/`.**

- **web** imports these directly via the `@shared` alias at build time.
- **app** (Flutter) can only bundle assets inside its own package, so it uses generated copies in `app/assets/*.json`. They are regenerated:
  - automatically on commit (lefthook `pre-commit` runs `scripts/sync-shared-assets.mjs --stage` when a `shared/*.json` is staged),
  - in CI before the release build,
  - manually with `pnpm sync:assets`.

---

## `scripts/`

Repo-wide Node scripts, invoked by Git hooks and CI:

| Script | Purpose |
|--------|---------|
| `sync-shared-assets.mjs` | Copies `shared/*.json` → `app/assets/*.json` (`--stage` re-stages them). Exposed as `pnpm sync:assets`. |
| `auto-scope.mjs` | Blocks a commit that touches both `app/` and `web/`, keeping per-package changelogs clean. |

See **[Git Hooks](Git-Hooks)** for how these run.

---

## Monorepo tooling

- **Package manager:** pnpm workspaces (`pnpm-workspace.yaml`)
- **Git hooks:** lefthook (`lefthook install`)
- **Commits:** Conventional Commits, enforced by commitlint
- **Releases:** semantic-release per component (`web-vX.Y.Z` / `app-vX.Y.Z` tags)
- **CI:** path-filtered workflows that only run when their component changes — see **[CI/CD](CI-CD)**
- **Git hooks:** lefthook runs formatting, linting, and commit-message checks locally — see **[Git Hooks](Git-Hooks)**
