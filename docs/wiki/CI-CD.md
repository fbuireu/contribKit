# CI/CD

CI is split per component with **path filters**, so an app change never triggers a web build and vice versa.

> **Path filters used to be where guards died here.** The CI was two workflows filtered by `paths:`, so every
> guard had to be paired with the question of which filter carried the files it read, and that was answered wrong
> three times: the app side, the preview-Worker cleanup, and `scripts/**` plus the root `package.json`, whose
> comments and version pins the contract asserts while no workflow watched them. A fourth copy of the filter had
> drifted and left preview Workers alive. There is one `ci.yml` now with **no path filter**, and a `changes` job
> that gates jobs with `if:` instead. Each component is linted, tested, built, versioned with semantic-release,
> and shipped: the web to Cloudflare, the app to Google Play. Workflows live in `.github/workflows/`.

| Workflow | Triggers on | Does |
|----------|-------------|------|
| `ci.yml` | every push and PR to `main`, plus manual dispatch | a `changes` job diffs the range and exposes `app`, `web` and `cross_package`; everything else is gated on it. Docs contract, the two per-client workflows, then release, deploy, preview comment and e2e |
| `_ci-app.yml` | reusable, called by `ci.yml` | Flutter format check, analyze, test with coverage, debug APK. Its jobs show as `App / Analyze`, `App / Test`, `App / Build` |
| `_ci-web.yml` | reusable, called by `ci.yml` | lint, format check, test with coverage, build, typecheck. Its jobs show as `Web / Check`, `Web / Build` |
| `_deploy.yml` | reusable | shared web deploy steps. Takes the GitHub Environment (`web-production` / `web-development`) and derives `CLOUDFLARE_ENV` from it by stripping the `<component>-` prefix |
| `release-app.yml` | manual (`workflow_dispatch`) | semantic-release **+ automatic Google Play delivery** |
| `cleanup-development.yml` | PR close | deletes the per-PR preview worker |
| `dependency-review.yml` | every PR | fails a PR that introduces a dependency with a known vulnerability |
| `dependabot-auto-merge.yml`, `renovate-auto-approve.yml` | dependency PRs | automated dependency updates |
| `sync-wiki.yml` | push to `main` under `docs/wiki/**` | publishes this wiki |
| `commit-message.yml` | PR opened / edited | commitlint on the PR title: the message a squash-merge actually commits |
| `zizmor.yml` | push / PR | GitHub Actions security linting |
| `dependency-review.yml` | PRs | fails a PR that introduces dependencies with known vulnerabilities |

---

## Web pipeline (`_ci-web.yml`, plus the deploy and release jobs in `ci.yml`)

```mermaid
---
config:
  look: handDrawn
  theme: neutral
---
flowchart LR
  check["web-check (pnpm verify)"] --> build["web-build (build + typecheck)"]
  build --> prod["deploy-production"]
  build --> dev["deploy-development"]
  build --> rel["release (semantic-release)"]
  dev --> comment["comment preview URL"]
```

- **web-check:** one `pnpm verify` — `format:check` (Biome, no writes), `typecheck` and the Vitest coverage run — then upload coverage to Codecov. The same command runs on `pre-push`, so a green push is a green check.
- **web-build:** production build + `pnpm lint:astro` (`astro check` over the Astro diagnostics). No workflow runs `tsc`; `pnpm lint:ts:typecheck` is a local command only.
- **deploy-production:** on push to `main`, build with `CLOUDFLARE_ENV=production`, then `wrangler deploy` → worker `contribkit` on `contribkit.app`.
- **deploy-development:** on PRs, build with `CLOUDFLARE_ENV=development`, deploy an ephemeral worker `pr-<n>-contribkit-development` on `*.workers.dev`; a bot comment posts the preview URL; the worker is removed on PR close by `cleanup-development.yml`, which carries no path filter at all, so no preview can outlive its pull request.
- **release:** semantic-release versions the web component (decoupled from deploy).

Both deploys pass an explicit `--message` (`<sha> - <event>`) to `wrangler deploy`. Without it, wrangler
annotates the deployment with the full commit message, and Cloudflare rejects the deploy when that message
is very long (e.g. a large squash-merge body). The API error does not mention the message at all.

Concurrency cancels in-progress runs for pull requests only.

> **The path filter is wider than `web/**` on purpose.** `shared/**`, `docs/**` and `*.md` are in the trigger list because the documentation-consistency contract runs inside `web-check`, and a guard that never fires on documentation changes is not a guard. The cost is that `deploy-production` sits behind the same filter, so **a documentation-only push to `main` redeploys the Worker**. That is accepted: the deploy is idempotent, and the alternative is a silently disabled contract. Removing any of those three patterns disables it.

---

**Both `astro build` steps are retried, three attempts with a 15-second wait**: the one in `_ci-web.yml` and the one
in `_deploy.yml`. Astro's font provider downloads Inter and JetBrains Mono from Google at build time, and Google
intermittently hands out a `fonts.gstatic.com` URL that then 404s, which fails the build with `CannotFetchFontFile`.
**Each attempt deletes `node_modules/.astro/fonts` first, and that is the part that makes the retry work at all.**
Astro caches the resolved URLs there, so a plain retry re-reads the dead one. A run on `338e6e3` failed three
times on the identical URL before the cache was cleared between attempts. They are `uses:` steps that `cd web`,
because a step running an action does not inherit the job's `working-directory`.

## App pipeline (`_ci-app.yml`)

Runs on every `app/**` change:

```mermaid
---
config:
  look: handDrawn
  theme: neutral
---
flowchart LR
  docs["docs-contract (pnpm test:docs)"]
  analyze["flutter-analyze (format + analyze --fatal-infos)"] --> build["flutter-build (debug APK)"]
  test["flutter-test (+ coverage → Codecov)"] --> build
```

- **docs-contract:** installs Node and the web dependencies and runs `pnpm test:docs`. It touches no Dart, and it lives in `ci.yml` ungated rather than in either per-client workflow, because a large share of its assertions are about the Flutter side and the rest are about the repository root.
- **flutter-analyze:** `dart format` verification + `flutter analyze --fatal-infos`.
- **flutter-test:** unit/widget tests with coverage uploaded to Codecov.
- **flutter-build:** builds a debug APK to catch build breakages early.

---

Every network-bound step in the app pipeline is cached: the Flutter SDK by `flutter-action`, pub by `~/.pub-cache`
keyed on `pubspec.lock`, and Gradle by `~/.gradle/caches` keyed on the Gradle files. **Nothing here is retried, on
purpose**: the failures this pipeline has actually seen were dependency resolution on a Renovate branch, which a
retry would only have made slower to report.

## Automatic Google Play delivery (`release-app.yml`)

The fancy part. Triggered manually with a **track** choice (`internal` / `alpha` / `beta` / `production`), it versions *and ships* the Android app end-to-end:

```mermaid
---
config:
  look: handDrawn
  theme: neutral
---
flowchart TD
  dispatch(["workflow_dispatch (track)"]) --> release["release: semantic-release (app)"]
  release -->|published?| gate{"new version?"}
  gate -->|no| stop(["nothing to ship"])
  gate -->|yes| deliver["deliver: Deliver to Google Play"]
  deliver --> sign["decode keystore + signing config"]
  deliver --> notes["generate Play notes from CHANGELOG"]
  deliver --> aab["flutter build appbundle --release"]
  sign & notes & aab --> upload["fastlane deploy → Google Play"]
```

1. **Version:** semantic-release computes the next version from Conventional Commits, updates the changelog, tags `app-vX.Y.Z`, and force-updates the major tag (`app-vX`). A `detect` step decides whether anything was actually published.
2. **Sign:** the upload keystore and Play service-account JSON are decoded from GitHub secrets at runtime; nothing sensitive is committed.
3. **Release notes:** the latest `CHANGELOG.md` section is transformed into a Google Play `changelogs/<versionCode>.txt`: drop the version header, flatten subheadings, unwrap Markdown links, strip bold/commit-hashes, bulletize, drop the commit-scope prefix from each bullet (the store page already names the app), and clamp to **500 chars** (Play's limit) on whole bullets. A bullet that does not fit is dropped entirely, never cut mid-word. The notes are also echoed to the job summary and uploaded as a `play-release-notes` build artifact on the run.
4. **Build:** `flutter build appbundle --release --dart-define-from-file=dart-defines.json`, where that file is written at runtime from the RevenueCat secret. The `release` build type runs R8 (code shrinking plus resource shrinking), so the AAB Play receives is minified; only the Java/Kotlin side is affected, the Dart code being AOT-compiled already. The workflow does not run `pnpm sync:assets`, but it does regenerate the mirror: a `Sync shared assets` step copies `shared/*.json` into `assets/` immediately before the build, so the AAB always ships the current tokens even if the commit did not.
5. **Upload:** `fastlane deploy track:<track>` pushes the AAB to the chosen Play track.

The job binds to the `app-production` or `app-development` GitHub Environment depending on the selected track, so production secrets stay scoped.

---

## GitHub Environments

Environments are repo-global, so they're namespaced by component (`<component>-<stage>`) and hold component-specific secrets:

| Environment | Component | Stage | Deployed by |
|-------------|-----------|-------|-------------|
| `web-production` | Astro web | production | `ci.yml` (push to `main`) |
| `web-development` | Astro web | development | `ci.yml` (per-PR preview) |
| `app-production` | Flutter app | production | `release-app.yml` (track = production) |
| `app-development` | Flutter app | development | `release-app.yml` (track ≠ production) |

App `development` is the internal Play track + RevenueCat sandbox; web `development` is a per-PR preview Worker. Component-scoped configs don't repeat the prefix: wrangler uses `[env.production]` / `[env.development]`; Flutter has no build flavors: locally the stage is whichever dart-defines file you pass (`dart-defines.prod.json` vs `dart-defines.json`), and in `release-app.yml` it is the `track` input, which selects the GitHub Environment whose `REVENUECAT_KEY` is written into `dart-defines.json` at build time.

---

## Releases & versioning

semantic-release runs per component and tags `web-vX.Y.Z` / `app-vX.Y.Z`, driven by Conventional Commits (enforced by commitlint, see **[Git Hooks](Git-Hooks)**). A pull request that touches both `web/` and `app/` is listed in both changelogs, which is correct when the change genuinely spans both clients, so the `cross-package-notice` job comments on it rather than blocking the merge. Web deploys are decoupled from versioning (production deploys on every qualifying push to `main`); the app's Play delivery is gated on a real semantic-release publish.

---

## Hardening & automation worth noting

- **Pinned actions:** every `uses:` is pinned to a full commit SHA, not a floating tag.
- **Least privilege:** workflows declare minimal `permissions`; `release-app.yml` starts from `permissions: {}` and grants per-job.
- **zizmor:** static security analysis of the workflows themselves.
- **Secrets never touch disk in the repo:** keystore and service-account JSON are base64/secret-decoded into `$RUNNER_TEMP` at runtime.
- **Dependency autopilot:** Dependabot and Renovate PRs are auto-approved/merged once green; pnpm enforces a `minimumReleaseAge` cooldown before pulling new versions.
- **Path-filtered, cancel-in-progress** concurrency keeps runs fast and cheap.

---

## See also

- **[Git Hooks](Git-Hooks)** runs the same checks locally before push.
- **[Web Application](Web-Application)** explains the `@astrojs/cloudflare` deploy gotcha.
- **[Mobile App](Mobile-App)** covers build configuration, signing, and the Tip Jar.
- **[Project Structure](Project-Structure)** covers the monorepo tooling.
