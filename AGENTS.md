# AGENTS.md

Agent-facing guide for **ContribKit**: a GitHub contribution calendar you can view, customize, export, embed, or pin to a phone's home screen. See [GLOSSARY.md](./GLOSSARY.md) for the domain glossary (Contribution Day, Cell, Palette, Tip, and the names to avoid); do not duplicate it here. [ARCHITECTURE.md](./ARCHITECTURE.md) is the big picture: the layer map for both clients, a request end to end, the failure sets, build and release, and the ADR index. Human-facing setup and commit rules are [CONTRIBUTING.md](./.github/CONTRIBUTING.md).

Reviewing a diff: [CODING_STANDARDS.md](./CODING_STANDARDS.md).

## What this is

A monorepo with two clients over one domain. **`web/`** is an Astro SSR site on Cloudflare Workers that also serves the public SVG and JSON endpoints. **`app/`** is a Flutter iOS/Android app with Home Screen Widgets. **`shared/`** holds the design tokens both consume. Neither client needs a GitHub token: both read the public contributions page ([ADR 0005](./docs/adr/0005-scrape-githubs-public-contributions-html.md)).

## Versions

This section names where each runtime is pinned and never what the pin says: read the file named beside each one. Each runtime is pinned exactly once, exactly, and re-pinned in no workflow; `pnpm test:docs` asserts all three.

- pnpm (root `packageManager`, the only pin, which `pnpm/action-setup` resolves in every job through the `prepare-env` composite action): always pnpm, never npm/yarn. [`app/package.json`](./app/package.json) declares none
- Node (the root `engines`, `web/engines` and [`.nvmrc`](./.nvmrc), which is the one CI installs): the three say the same thing
- Flutter (`environment.flutter` in [`app/pubspec.yaml`](./app/pubspec.yaml), which [`_ci-app.yml`](./.github/workflows/_ci-app.yml) installs from through `flutter-version-file`): a mismatched local Flutter blocks `pub get` and codegen, so install the pinned one rather than editing the pin
- Dart is a **range**, not a pin: `environment.sdk` is bounded to the minor, the Dart you run is whichever one the pinned Flutter ships, and Renovate is told not to manage the line. A human widens the bound when a Flutter bump crosses a Dart minor; the docs test rejects an exact version there
- Ruby ([`app/android/.ruby-version`](./app/android/.ruby-version)), which `setup-ruby` in [`release-app.yml`](./.github/workflows/release-app.yml) reads before `bundle install` brings in fastlane

## Commands

```bash
pnpm sync:assets                 # copy shared/*.json into app/assets (also runs on commit)

# web/: run from web/
pnpm dev                         # astro dev (dev:open appends --open)
pnpm build                       # astro build
pnpm wrangler:dev                # build + wrangler dev (real Workers runtime)
pnpm typecheck           # wrangler types + astro sync (the astro:env types) + tsc --noEmit
pnpm check               # astro check: the only thing that typechecks .astro files
pnpm verify:static       # format:check + typecheck + check: everything verify does but the suite
pnpm verify              # verify:static + coverage: what CI runs
pnpm verify:changed      # verify:static + test:ut:changed + test:docs: what pre-push runs

pnpm lint:all                    # biome lint over web, docs, .github and scripts
pnpm format:all                  # biome check --write, the same four
pnpm format:check                # biome check, read-only: what CI runs
pnpm test:ut                        # vitest
pnpm test:docs                   # the maintenance contract alone (also runs inside pnpm test:ut)
pnpm test:e2e                    # playwright, in Chromium and WebKit

# app/: run from app/
dart analyze                     # must be clean; CI runs --fatal-infos
flutter test
flutter test --coverage && dart run tool/check_coverage.dart   # the floor CI and pre-push enforce
dart run build_runner build      # after touching a @freezed / @riverpod / DTO class
```

`verify`'s coverage step carries a floor on all four metrics, one `MIN_THRESHOLD` in [`web/vitest.config.ts`](./web/vitest.config.ts), the same shape and number as the sibling repositories'; the provider is `istanbul`, because `@vitest/coverage-istanbul` is what this package installs. The app's floor is `minThreshold` in [`app/tool/check_coverage.dart`](./app/tool/check_coverage.dart), which reads `coverage/lcov.info` because `flutter test` has no minimum of its own; CI and the `flutter-test` pre-push hook both run it. Codecov only reports: its statuses are `informational: true` in [`.github/codecov.yml`](./.github/codecov.yml).

The hooks: `pre-commit` formats staged files, runs `dart analyze --fatal-infos` and syncs `shared/*.json`; `commit-msg` runs commitlint; `pre-push` runs `pnpm verify:changed` for the web, and `dart analyze --fatal-infos` plus the app's coverage run when a Dart file, `pubspec.yaml` or `analysis_options.yaml` is in the push. CI runs the full `pnpm verify`; [CONTRIBUTING.md](./.github/CONTRIBUTING.md) says why the hook stops short of it.

A `package.json` script runs under `cmd` on Windows, which passes `$(...)` through as literal text, so a `:changed` variant names a literal base (`test:ut:changed` takes `origin/main`) and the docs test rejects a substitution. Biome's `--changed` diffs against `vcs.defaultBranch`, which is `main`, so on `main` `pnpm format:changed` selects nothing: reach for `format:all` there.

**The app has no build flavors.** The stage is chosen by which `dart-defines` file is passed, and `--flavor` fails because there is nothing for it to name: the two files differ by one key ([ADR 0022](./docs/adr/0022-the-app-has-no-build-flavors-and-the-stage-is-a-dart-defines-file.md)).

## Structure

```
GLOSSARY.md          domain glossary: the single vocabulary both clients obey
CODING_STANDARDS.md the rules a reviewer holds a diff to
ARCHITECTURE.md     the big picture, and the only ADR index
.github/            CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md, the templates and the workflows
docs/docs-consistency.test.ts  the repo-wide contract: the one test that lives with its subject, not with the code
docs/adr/           decisions (0001…), sequentially numbered
docs/plans/         deferred work, kept because the decision to defer is recorded
docs/wiki/          the published GitHub wiki (synced by sync-wiki.yml)
shared/             palettes.json, shapes.json, usernames.json
web/src/            domain → application → infrastructure / ui / pages
app/lib/            domain → application → infrastructure / ui
```

Both clients use the same layered architecture with a strict inward dependency direction ([ADR 0003](./docs/adr/0003-layered-domain-architecture-in-both-clients.md)). Web aliases ([`web/tsconfig.json`](./web/tsconfig.json)): `@shared/* @domain/* @application/* @infrastructure/* @ui/*`. An import that crosses a layer uses the alias and one that stays inside its layer is relative, so an alias always marks a crossed boundary; Dart imports are package imports throughout.

**Nested guides**. Read the one for the folder you are touching:

| Folder | Covers |
| --- | --- |
| [`web/src/domain/`](./web/src/domain/AGENTS.md) | value objects, the twins with the app, dates, grid and geometry gotchas |
| [`web/src/application/`](./web/src/application/AGENTS.md) | curried use cases, `Failure` → HTTP mapping, logging and caching helpers |
| [`web/src/infrastructure/`](./web/src/infrastructure/AGENTS.md) | GitHub scraping, SVG renderer, email, logging |
| [`web/src/ui/`](./web/src/ui/AGENTS.md) · [`components/`](./web/src/ui/components/AGENTS.md) | the client controller, the markup contract, component groups |
| [`web/src/pages/`](./web/src/pages/AGENTS.md) | routes, the composition root, the middleware |
| [`app/lib/domain/`](./app/lib/domain/AGENTS.md) | pure Dart core, entities, value objects |
| [`app/lib/application/`](./app/lib/application/AGENTS.md) | one class per use case |
| [`app/lib/infrastructure/`](./app/lib/infrastructure/AGENTS.md) · [`github/dtos/`](./app/lib/infrastructure/github/dtos/AGENTS.md) | clients, persistence, export, DTOs |
| [`app/lib/ui/`](./app/lib/ui/AGENTS.md) · [`di/`](./app/lib/ui/di/AGENTS.md) · [`theme/`](./app/lib/ui/theme/AGENTS.md) | widgets, providers, wiring, tokens |

## Conventions

- **One argument is positional; two or more are one object**, typed `<FunctionName>Params`: `paletteByKey(key)`, `toIsoDate(date)`; `walk({ dir, match }: WalkParams)`. A Dart function with two or more parameters takes them named.
- **The layers import only inwards**, and a cross-layer import goes through its alias.
- **No comments** in hand-written source, doc comments included, bar the tool directives `// @vitest-environment` and `/// <reference>`. The reason for a line goes in the commit message, the pull request, an ADR or [CODING_STANDARDS.md](./CODING_STANDARDS.md) ([ADR 0021](./docs/adr/0021-the-source-carries-no-comments-and-the-documents-carry-the-reasons.md)).
- `pnpm test:docs` fails on a breach of any of the three.
- **Edit `shared/`, never `app/assets/`.** The copies are generated, and the docs test fails when they drift.
- **Conventional commits** (commitlint + lefthook), scoped to a workspace package (`contribkit-web`, `contribkit-app`, `global`) or unscoped. semantic-release owns versioning. Do NOT add a Co-Authored-By / Claude trailer to commits or PRs.

## Maintenance contract

These documents are not generated. When you change code, update the docs **in the same commit**: a follow-up commit is a promise, not a fix.

[`docs/docs-consistency.test.ts`](./docs/docs-consistency.test.ts) holds these documents, [CODING_STANDARDS.md](./CODING_STANDARDS.md) and the `.github` ones included, to the claims it can check against the repository: links, cited paths and filenames, ADR numbering, shape, index and references, pins and stated versions, package scripts, the guide maps, the twins written in more than one language, the observability, release and workflow configs, and the code rules `CODING_STANDARDS.md` lists as enforced. It runs with `pnpm test:ut`, and on its own with `pnpm test:docs`; CI runs it ungated on every push and pull request ([ADR 0015](./docs/adr/0015-the-maintenance-contract-is-enforced-by-a-test.md)). A failure means the docs and the code disagree: fix whichever is wrong, and **never delete an assertion to make it pass**. It cannot check prose or rationale; that part is still on you, and a doc claim you did not verify against the file is a doc claim that is wrong.

| If you change | Update |
| --- | --- |
| What a domain word means, or introduce a new one | [`GLOSSARY.md`](./GLOSSARY.md): the glossary, vocabulary only |
| A rule about how code is written | [`CODING_STANDARDS.md`](./CODING_STANDARDS.md) |
| An identifier that a glossary `_Avoid_` list forbids | the code, not the glossary |
| A folder's layout, or a coupling or gotcha its guide states | that folder's `AGENTS.md` (table above) |
| A behaviour a doc states as an invariant or a gotcha | that bullet, or delete it if it stopped being true |
| A palette, shape, or suggested username | `shared/*.json`, then `pnpm sync:assets`, then the README's feature list |
| How contributions are fetched or parsed | **both** clients: the parser is duplicated on purpose ([ADR 0011](./docs/adr/0011-keep-the-apps-own-scraper-for-now.md)) |
| A constant of the Cell geometry | the Dart, the TypeScript and `ContribKitWidgetProvider.kt` in one change ([ADR 0020](./docs/adr/0020-the-cell-geometry-is-the-apps-in-three-languages.md)) |
| A public endpoint's behaviour or caching | [`web/README.md`](./web/README.md) and [`docs/wiki/API-Reference.md`](./docs/wiki/API-Reference.md) |
| A `Failure` kind | the exhaustive matches that render it, on the web `failure-http.ts` and both tables in `contribution-errors.ts`, and [ADR 0004](./docs/adr/0004-typed-failures-instead-of-thrown-exceptions.md) if the contract itself moved |
| What a cached calendar means, a DTO field's nullability or the order of `ContributionLevel` | bump `_cacheBoxName` and list the old name in `legacyContributionCacheBoxNames` ([ADR 0014](./docs/adr/0014-cached-calendars-are-versioned.md)) |
| A stored Hive key | a new key goes through `_tolerating`; a renamed one keeps a legacy fallback and a migration test, or a person silently loses the setting |
| A repository the background isolate builds, or behaviour the Home Screen Widget depends on | `callbackDispatcher` in [`app/lib/main.dart`](./app/lib/main.dart), which builds its repositories by hand, and `HomeScreenWidgetRefresh`, never the notifier |
| An `AppColors` field | both colour schemes in `app/lib/main.dart` |
| A widget that shows Contribution Data and is not a `Text` or an `Image` | `contributionDataWidgets` ([ADR 0029](./docs/adr/0029-diagnostic-reports-carry-a-masked-session-replay.md)) |
| What the app sends off the device | [`web/src/pages/privacy.astro`](./web/src/pages/privacy.astro), the Privacy sheet's description, **and** the Play *Data safety* form, whose contents are recorded in [ADR 0028](./docs/adr/0028-telemetry-consent-is-asked-twice-and-answered-asymmetrically.md). The policy names the processors and the region, so a changed host is a policy change. A Contact Message carries a name, an address and text a person typed, which is why that table has *Personal info* and *Messages* rows no consent switch governs ([ADR 0030](./docs/adr/0030-contact-messages-leave-through-cloudflares-send-email-binding.md)) |
| A decision an ADR records | that ADR: amend it, or supersede it with a new one and say so in both `## Status` blocks |
| The layer map, a run end to end, or the release pipeline | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| A claim `docs/docs-consistency.test.ts` asserts, on purpose | the doc first; the test only when the claim itself is what changed |

A new ADR starts as a copy of [ADR 0000](./docs/adr/0000-adr-template.md), the template, which says when a decision earns one and where to link it from.

## Gotchas

- **A rename is not done until the storage key, the background isolate and the generated code agree.** The WorkManager isolate in `app/lib/main.dart` reads settings through `HiveSettingsRepository` like everything else, so a renamed key is a compile error there; the `@freezed` and `@riverpod` outputs are committed, so they need `dart run build_runner build` in the same change.
- **The release config teaches both commit-parsing plugins the `!` grammar** through `parserOpts`, which `pnpm test:docs` holds equal: without it `feat(x)!: …` is analysed with no type, the job ends green and nothing is released, while commitlint accepts the `!`. The `preset` route does not work here: the notes step dies on *Missing helper*. `!` means major on any type, as a `BREAKING CHANGE:` footer does.
- **Both components push a release commit, and the `release` concurrency group is what orders them**: `ci.yml` releases web on a push to `main`, `release-app.yml` releases app on a dispatch, and both jobs share the group, which the docs test asserts. The release commit is `chore(<package>): release <version> [skip ci]`, the one commit on `main` commitlint never sees, so the docs test asserts its shape too; the `[skip ci]` is what stops it starting the run that cuts the next release.
- **`minimumReleaseAge` is declared twice, in two units, and Renovate's stays the longer.** [`pnpm-workspace.yaml`](./pnpm-workspace.yaml) counts minutes, so `4320` is three days, and Renovate's own in [`renovate.json`](./.github/renovate.json) is written with its unit, four days. Renovate's lockfile update resolves through pnpm, which refuses a version younger than its own wait, so a pull request that named a version inside that wait would fail its install: the extra day is the margin, and `pnpm test:docs` fails when Renovate's wait is the shorter.
- **The `# Renovate security update:` lines in `pnpm-workspace.yaml` are Renovate's.** renovate[bot] writes one above each entry it adds to `minimumReleaseAgeExclude` when it exempts a security fix from `minimumReleaseAge`, naming what the entry names: `<pkg>@<version>`, or `<pkg>@<version> || <version>` once a second fix for the same package lands before the first entry is removed. Nothing reads it back, so it is bot output like the lockfile, and the docs test allows any line with that prefix, in that file alone.
- **`typescript` stays below its next major, and nothing holds Renovate back from it.** `astro check` cannot run on the next major: `@astrojs/language-server` reaches for the programmatic API the next major's Go compiler does not ship. Renovate opens that major's pull request like any other, and it fails `astro check` until the language server reads the native compiler; leave it open and merge it that day.

## Deploy

Web deploys to Cloudflare Workers via `ci.yml`: production on a push to `main`, a per-PR preview otherwise. It is server-rendered because the SVG endpoint cannot be prerendered ([ADR 0007](./docs/adr/0007-server-rendered-web-app-on-the-edge.md)). The app ships to Google Play through `release-app.yml` on a manual dispatch with a track. The two components are released independently, which is why GitHub Environments are namespaced `<component>-<stage>` ([ADR 0001](./docs/adr/0001-monorepo-with-independently-released-components.md)); the workflows, the smoke run and the rollback are on the [CI/CD wiki page](./docs/wiki/CI-CD.md).

- **The deploy names its wrangler environment.** `_deploy.yml` derives the stage from the GitHub Environment and passes it to the build as `CLOUDFLARE_ENV`, which is Astro's switch, and to `wrangler deploy` as `--env`, which is wrangler's: the two custom domains and the rate limiters live under `[env.production]` and `[env.development]` in `web/wrangler.toml`, and wrangler never inherits a binding into a named environment.
- **The top level of `web/wrangler.toml` mirrors production's observability, and declares `[placement]` once.** Its `name` is the production Worker's, so a hand-run `wrangler deploy` with no `--env` lands on production, and wrangler turns observability off on a deploy whose selected config omits it. `pnpm test:docs` asserts the shape.
- **`SITE_URL` is a repository variable, read as `process.env.SITE_URL` in `astro.config.ts`, not `import.meta.env`**, which exposes only `PUBLIC_`-prefixed names. It has to be a repository variable rather than one on `web-production`: neither a job that declares no `environment:` nor a job that calls a reusable workflow can read an environment-scoped `vars`. The deploy and the smoke run both read it, and `smoke` fails at its first step when it is empty.
- **The smoke cases carry `@smoke` in [`web/e2e/smoke.spec.ts`](./web/e2e/smoke.spec.ts)**: the four every repository that deploys runs word for word (a titled homepage, an unknown path answering 404, `robots.txt`, and `/.well-known/security.txt` as `text/plain` with a `Contact:`, an `Expires:` still ahead and, when `PRODUCTION_URL` names the `BASE_URL` it runs against, a `Canonical:` that is the URL it asked for; the smoke job sets both from `SITE_URL`, and no other run sets `PRODUCTION_URL`), plus `/user/<name>.svg`, the route that cannot be prerendered and so the one that tells a running Worker from a bucket of assets. That case asks for `/user/foo_bar.svg`: a Username cannot contain `_`, so the Worker answers its 400 before any request leaves it, and a GitHub outage cannot fail the run and roll back a healthy deploy. The step passes no `--pass-with-no-tests`. `release` needs `deploy-production` and `smoke`, so a tag means the version is live, and a failed smoke run rolls production back. `/api/health` is out of the set: production answers it with HTML to a datacenter address, a bot rule on `/api/*` in the zone that Cloudflare's **Security Events** log names.
- **[`web/public/.well-known/security.txt`](./web/public/.well-known/security.txt) lapses unless it is renewed.** Its `Expires` is two years after its last renewal, the longest the docs test allows, and `pnpm test:docs` fails 30 days before that date, reading the real clock on purpose, so `main` turns red a month ahead and the fix is to move `Expires` forward, at most two years. The same rule holds its fields (`Contact`, `Expires`, `Preferred-Languages`, `Canonical`, `Policy`, in that order), its `Canonical` to the `site` `web/astro.config.ts` falls back to plus `/.well-known/security.txt`, and its `Policy` to this repository's. Workers Assets answers it as `text/plain` before the Worker runs, so the middleware never sees it, and `public/_headers` adds its three headers, none of which changes its type.
- **The preview's Cloudflare Access token reaches the preview's origin alone.** Every spec takes `test` and `expect` from [`web/e2e/fixtures.ts`](./web/e2e/fixtures.ts), never from `@playwright/test`: with `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` set, as the `e2e` job sets them, it adds the service token as `CF-Access-Client-Id` and `CF-Access-Client-Secret` to the requests whose origin is the `baseURL`'s and to the `request` fixture, and to nothing a third party serves; with neither set it adds nothing, and with one alone it throws. The check on the two variables, the origin test and the header merge are [`web/e2e/previewAccess.ts`](./web/e2e/previewAccess.ts), unit-tested beside it, and `web/playwright.config.ts` matches `*.spec.ts` alone so that test stays vitest's. No config sets `extraHTTPHeaders`, because Playwright sends those on every request a page makes, third parties included.
- **`Check` is the one context the ruleset requires**, an aggregate over every gated job under `always()`: a job that must gate a merge goes in its `needs`, and the docs test asserts the list. The preview cleanup queues behind the pull request's own CI run, in the group `CI-refs/pull/<n>/merge` that `ci.yml` computes for it.
- **The contact form adds two bindings, one repository variable and no secret** ([ADR 0030](./docs/adr/0030-contact-messages-leave-through-cloudflares-send-email-binding.md)). `CONTACT_EMAIL` (`send_email`) is declared at the top level **and** in each named environment, `CONTACT_RATE_LIMITER` in each named environment like `API_RATE_LIMITER`, and the **`MAINTAINER_EMAIL` repository variable** takes the `SITE_URL` route: `_deploy.yml` passes it to the build, `astro.config.ts` declares it a required `server`, `public` field, and Astro inlines it, so a changed mailbox reaches nothing until something redeploys. No file can assert that the mailbox is a verified destination in Email Routing: if it is not, every send answers 502 with the platform's reason in Better Stack.
- **A manual dispatch on `main` redeploys production and the smoke run behind it**, and cuts no release. The build inlines the public variables, so a rotated analytics token reaches nothing until something redeploys, and the only credentials `_deploy.yml` handles are wrangler's own. The `changes` job counts `docs/**`, `shared/**` and `*.md` as web changes, so a docs-only push to `main` redeploys production too.
- **A commit that touches both `app/` and `web/` is filed in both changelogs**, because `semantic-release-monorepo` attributes by path and `main` takes squash merges; the `cross-package-notice` job comments on such a pull request and does not block it.
