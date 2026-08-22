# CLAUDE.md

Agent-facing guide for **ContribKit**: a GitHub contribution calendar you can view, customize, export, embed, or pin to a phone's home screen. See [CONTEXT.md](./CONTEXT.md) for the domain glossary (Contribution Day, Cell, Palette, Tip, and the names to avoid); do not duplicate it here. [ARCHITECTURE.md](./ARCHITECTURE.md) is the big picture: the layer map for both clients, a request end to end, the failure sets, build and release, and the ADR index. Human-facing setup and commit rules are [CONTRIBUTING.md](./CONTRIBUTING.md).

## What this is

A monorepo with two clients over one domain. **`web/`** is an Astro 7 SSR site on Cloudflare Workers that also serves the public SVG and JSON endpoints. **`app/`** is a Flutter iOS/Android app with home-screen widgets. **`shared/`** holds the design tokens both consume. Neither client needs a GitHub token: both read the public contributions page. See [ADR 0005](./docs/adr/0005-scrape-githubs-public-contributions-html.md).

## Stack

- **web**: Astro 7.2 (`output: "server"`), `@astrojs/cloudflare`, TypeScript, Biome, Vitest, Playwright
- **app**: Flutter 3.47.0 / Dart 3.13.0, Riverpod + `riverpod_generator`, `freezed`, Hive (cache + settings), RevenueCat, `home_widget` + `workmanager`
- **shared**: plain JSON, imported by web at build time and mirrored into `app/assets/` ([ADR 0002](./docs/adr/0002-shared-design-tokens-mirrored-into-the-flutter-bundle.md))
- **repo**: pnpm workspaces, lefthook, commitlint, semantic-release per component

## Versions (pinned: match exactly)

- pnpm **11.21.0**: always pnpm, never npm/yarn. The root `packageManager` is the **only** pin: it is what
  `pnpm/action-setup` resolves everywhere it runs, because `ci.yml` and `release-app.yml` pass
  `package_json_file: package.json` explicitly, and the `prepare-env` composite action passes nothing, which
  defaults to the same root manifest. `app/package.json` deliberately declares none, which a docs guard asserts.
  It used to carry the second pin, and because Renovate's `includePaths` did not list the root manifest, that copy
  was the one it kept current. Consolidating onto the root pin silently rolled the package manager back three
  minors, until this was caught and the root was bumped to match
- Node **26.7.0**, stated three times and always the same: the root `engines`, `web/engines` and `web/.nvmrc`, which
  is the one CI installs. They used to differ (v26.3.0 at the root against 26.5.1 in web) for no recorded reason.
- Flutter **3.47.0**, Dart **3.13.0** (`app/pubspec.yaml`). A mismatched local Flutter blocks `pub get` and codegen; do not "fix" it by editing the pin.

## Commands

```bash
pnpm sync:assets                 # copy shared/*.json into app/assets (also runs on commit)

# web/: run from web/
pnpm dev                         # astro dev --open
pnpm build                       # astro build
pnpm wrangler:dev                # build + wrangler dev (real Workers runtime)
pnpm typecheck           # wrangler types + tsc --noEmit
pnpm verify              # format:check + typecheck + coverage — what CI and pre-push run
pnpm lint:all                    # biome lint
pnpm format:all                  # biome check --write
pnpm format:check                # biome check, read-only: what CI runs
pnpm test:ut                        # vitest
pnpm test:docs                   # the maintenance contract alone (also runs inside pnpm test:ut)
pnpm test:e2e                    # playwright

# app/: run from app/
flutter analyze                  # must be clean; CI runs --fatal-infos
flutter test
dart run build_runner build      # after touching a @freezed / @riverpod / DTO class
```

## Structure

```
CONTEXT.md          domain glossary: the single vocabulary both clients obey
ARCHITECTURE.md     the big picture, and the only ADR index
CONTRIBUTING.md     setup, checks, commit rules, release trains
docs/docs-consistency.test.ts  the repo-wide contract: the one test that lives with its subject, not with the code
docs/adr/           decisions (0001…), sequentially numbered
docs/plans/         deferred work, kept because the decision to defer is recorded
docs/wiki/          the published GitHub wiki (synced by sync-wiki.yml)
shared/             palettes.json, shapes.json, usernames.json
web/src/            domain → application → infrastructure / ui / pages
app/lib/            domain → application → infrastructure / ui
```

Both clients use the same layered architecture with a strict inward dependency direction ([ADR 0003](./docs/adr/0003-layered-domain-architecture-in-both-clients.md)). Web aliases (`web/tsconfig.json`): `@shared/* @domain/* @application/* @infrastructure/* @ui/*`. Prefer aliases over relative paths.

**Nested guides**. Read the one for the folder you are touching:

| Folder | Covers |
| --- | --- |
| [`web/src/domain/`](./web/src/domain/CLAUDE.md) | purity rules, value objects, failures, services |
| [`web/src/application/`](./web/src/application/CLAUDE.md) | curried use cases, `Failure` → HTTP mapping |
| [`web/src/infrastructure/`](./web/src/infrastructure/CLAUDE.md) | GitHub scraping, SVG renderer, logging |
| [`web/src/ui/`](./web/src/ui/CLAUDE.md) · [`components/`](./web/src/ui/components/CLAUDE.md) | component groups, colocation |
| [`web/src/pages/`](./web/src/pages/CLAUDE.md) | routes, the composition root |
| [`app/lib/domain/`](./app/lib/domain/CLAUDE.md) | pure Dart core, entities, value objects |
| [`app/lib/application/`](./app/lib/application/CLAUDE.md) | one class per use case |
| [`app/lib/infrastructure/`](./app/lib/infrastructure/CLAUDE.md) · [`github/dtos/`](./app/lib/infrastructure/github/dtos/CLAUDE.md) | clients, persistence, export, DTOs |
| [`app/lib/ui/`](./app/lib/ui/CLAUDE.md) · [`di/`](./app/lib/ui/di/CLAUDE.md) · [`theme/`](./app/lib/ui/theme/CLAUDE.md) | widgets, providers, wiring, tokens |

## Conventions

- **Speak the glossary.** [`CONTEXT.md`](./CONTEXT.md) is prescriptive: if the code says something its `_Avoid_` list names, the code is what is wrong. Do not "fix" the glossary to match a stale identifier.
- **No code comments**, of any kind, doc comments included. Rationale belongs in commit messages, ADRs, or a
  folder's guide, never inline ([ADR 0021](./docs/adr/0021-the-source-carries-no-comments-and-the-documents-carry-the-reasons.md)).
- **Errors are a sealed, typed set.** Returned as values on the web, thrown and matched without a wildcard in the app ([ADR 0004](./docs/adr/0004-typed-failures-instead-of-thrown-exceptions.md)). Never widen a match with `_` to silence the compiler.
- **Never invent data for the user.** An unknown Count is not zero, and must not be estimated, summed, or displayed as exact.
- **Edit `shared/`, never `app/assets/`.** The copies are generated.
- **Conventional commits** (commitlint + lefthook). semantic-release owns versioning. Do NOT add a Co-Authored-By / Claude trailer to commits or PRs.

## Maintenance contract

These documents are not generated. A change that does not update them leaves the tree describing code that no longer exists, so when you change code, update the docs **in the same commit**. A follow-up commit is a promise, not a fix.

`docs/docs-consistency.test.ts` makes the mechanical half executable: it reads every document as data and asserts the checkable claims against the repo. It runs with `pnpm test:ut`, and on its own with `pnpm test:docs`.

| It asserts | Worth knowing |
| --- | --- |
| Every relative link, `../../wiki/` shorthand and cited source path resolves | |
| No `file.ts:123` citation anywhere | they rot the moment anything above them moves, so name the symbol instead |
| The ADR set holds its template | sequential numbering from 0000, `NNNN-kebab-title.md`, the `# N. Title` / Date / Status / *Context* / *Decision* / *Consequences* shape, a row in the [`ARCHITECTURE.md`](./ARCHITECTURE.md) index, and a link from some document **other** than that index |
| `shared/*.json` equals its mirror in `app/assets/` | normalised for trailing whitespace as well. **Every file the contract reads is normalised for line endings**, in `read` itself: a Windows clone with `core.autocrlf=true` used to fail two ADR assertions that compare a heading against a stored title, which is a guard failing for a non-reason |
| The README's feature *line* names every palette and shape shipped | the line, not the file: `GitHub` and `square` occur elsewhere in the README and made the old whole-file check unfailable |
| Every pinned version matches the manifest that pins it, and exactly one manifest pins pnpm | |
| Every documented `pnpm` script is declared in a `package.json` | read from code spans, so prose saying "the pnpm and Node pins" is not mistaken for a command |
| Every source layer carries a nested `CLAUDE.md`, listed in both maps, with no stray `CONTEXT.md` outside the root | |
| Nothing under `web/src/pages` becomes a public URL by accident | [ADR 0018](./docs/adr/0018-src-pages-is-a-public-namespace-not-a-folder.md) |
| Every bare filename a guide cites still exists | searched across `app/lib`, `app/test`, `web/src`, `web/e2e` and `web/workers`: a guide pointing at the test that pins a rule is citing the most useful file it could |
| Every glossary term is used somewhere outside the glossary | |
| No identifier is named after a word a glossary `_Avoid_` list rejects | narrower than it sounds: see below |
| No `//` **or `/* */`** comment in any hand-written source | `app/lib`, `app/test`, `web/src`, `web/e2e`, `web/workers`, `docs/`, `scripts/` and the three `web/*.config.ts`. The exception list is exactly `// @vitest-environment` and `/// <reference>`, the two the runner reads, so a `///` Dart doc comment or a `// @TODO` is caught like any other. The block form was invisible for a year |
| The web layers import only inwards | over `.astro` as well as `.ts`, and over every import form rather than `from "…"` alone: that hole is how a marketing component reached around the domain and counted the raw token JSON instead of the filtered `CELL_SHAPES` |
| `shadcn_ui` stays inside `app/lib/ui/widgets/`, the theme and the composition root | |
| **Two things written more than once stay identical** | the Embed contract in Dart and TypeScript, and the dark palette in its two CSS blocks. A third used to be here, the web path filter written across three workflows, and it is gone because the filters are gone: one unfiltered `ci.yml` replaced them |
| Every `tail_consumers` entry names the Worker `web/workers/tail/wrangler.toml` declares | nothing deploys that Worker from CI, so a rename in either file stops log forwarding with no error anywhere |

**The glossary guard polices far less than its name suggests, deliberately.** It covers the code-shaped terms (`ShapeKind`, `DOW`, `IAP`, `SKU`) anywhere, plus a curated set of plain words (`purchase`, `paywall`, `heatmap`, `donation`, …) in `.ts` and `.dart` with string literals stripped, so it reads identifiers rather than prose. A companion assertion proves every policed word is one `CONTEXT.md` actually rejects, so the list cannot invent a rule. It is not all 106 terms and cannot be: most are ordinary English (`value`, `range`, `save`) that any codebase uses honestly, and some name a platform API rather than our vocabulary: `showPopover` is the HTML Popover API, not a Cell Tooltip called the wrong thing. For the same reason `SDK_SEAMS` exempts the one file that speaks to the store SDK, whose job is to talk the vendor's language on one side and the glossary's on the other; a third assertion caps that list at two and checks each file still exists, so the exemption cannot quietly grow. The stripper removes Dart raw strings before escape sequences and works one line at a time, so a regex literal cannot break quote pairing for the rest of a file.

A failure means the docs and the code disagree: fix whichever is wrong, and **never delete an assertion to make it pass**. It cannot check prose or rationale; that part is still on you. Keep its assertions aggregated (one failing list per rule) rather than one case per document.

| If you change | Update |
| --- | --- |
| What a domain word means, or introduce a new one | [`CONTEXT.md`](./CONTEXT.md): vocabulary only, no implementation |
| An identifier that a glossary `_Avoid_` list forbids | the code, not the glossary |
| A folder's layout or a rule its guide states | that folder's `CLAUDE.md` (table above) |
| A palette, shape, or suggested username | `shared/*.json`, then `pnpm sync:assets`, then the README's feature list |
| How contributions are fetched or parsed | **both** clients: the parser is duplicated on purpose ([ADR 0011](./docs/adr/0011-keep-the-apps-own-scraper-for-now.md)) |
| A public endpoint's behaviour or caching | [`web/README.md`](./web/README.md) and `docs/wiki/API-Reference.md` |
| A `Failure` kind | the exhaustive match that renders it, and [ADR 0004](./docs/adr/0004-typed-failures-instead-of-thrown-exceptions.md) if the contract itself moved |
| A stored Hive key | add a legacy fallback and a migration test, or users silently lose the setting |
| A decision an ADR records | that ADR: amend it, or supersede it and say so in both `## Status` blocks |
| The layer map, a run end to end, or the release pipeline | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| A claim the docs-consistency test asserts, on purpose | the doc first; the test only when the claim itself changed |

Propose an ADR in [`docs/adr/`](./docs/adr/) when a decision is **hard to reverse**, **surprising without context**, and **the result of a real trade-off**. All three, or it is not an ADR. Copy [`0000-adr-template.md`](./docs/adr/0000-adr-template.md) to `NNNN-kebab-title.md`, numbered one above the highest existing file; the `# N. Title` heading carries that same number, and Date / Status / Context / Decision / Consequences are all required. Add a row to the index in [`ARCHITECTURE.md`](./ARCHITECTURE.md) **and** link it from wherever it bites: a gotcha here, a nested guide, a wiki page. Both are asserted, because an ADR only the index points at will not be read. Refer to one as `ADR 0007`, never `ADR 7`: the four-digit form is what the dangling-reference guard can see.

Three traps worth naming, because all three have already happened here:

- **A rename is not done until the storage key, the background isolate, and the generated code agree.** `main.dart`'s WorkManager isolate used to read Hive directly, so it survived renames and drifted silently; it now goes through `HiveSettingsRepository` like everything else, which is what makes a renamed key a compile error there rather than a widget that quietly stops updating.
- **A doc claim you did not verify is a doc claim that is wrong.** ADRs here have asserted exhaustive matching that a wildcard disabled, a shared token nothing reads, and a launch year off by three. Check literally, against the file.
- **A guard that never runs is not a guard, and this repository stopped relying on filters to avoid it.** The CI
  used to be two path-filtered workflows, so every assertion had to be paired with the question "which filter
  carries the files it reads". That question was answered wrong **three times**: the app side, the preview-Worker
  cleanup, and then `scripts/**` plus the root manifest, where the contract policed comments and asserted the
  version pins while a change to either started nothing at all. A fourth copy of the filter, in the cleanup
  workflow, had silently drifted four entries behind and left preview Workers alive.
  There is one `ci.yml` now, with **no path filter**, and a `changes` job that gates jobs by `if:` instead. The
  docs contract runs ungated inside it. So the question no longer has to be asked, and `ci-web-noop.yml`, which
  existed only to keep a check requireable past a filter, is gone.
  And a guard that fails for a non-reason is not a guard either: this file's own assertions used to time out at
  five seconds under a parallel run while passing in four alone, so it sets its own `testTimeout`, and `read`
  normalises line endings so a Windows clone does not fail them.

## Gotchas

- **Levels come from GitHub, not from us.** Both parsers read `data-level` as authoritative. Only the app derives a level from the count when the attribute is missing; the web drops the day and lets the grid backfill it.
- **The app's grid is always 53×7.** Dates outside the requested year are padded as empty days, so week counts never vary: stats that divide by `weeks.length` depend on this ([ADR 0013](./docs/adr/0013-the-app-grid-is-always-53-by-7.md)).
- **The cache is versioned.** Changing what a cached calendar means requires bumping `_cacheBoxName`; past-year entries never expire on their own ([ADR 0014](./docs/adr/0014-cached-calendars-are-versioned.md)).
- **The parser uses regexes on purpose.** There is no DOM in a Worker; do not "upgrade" it to an HTML parser ([ADR 0006](./docs/adr/0006-parse-the-contributions-page-with-regexes.md)).
- **Tips unlock nothing.** No code may start checking purchase state ([ADR 0009](./docs/adr/0009-tips-are-unconditional-and-unlock-nothing.md)).
- **`cellSize` on the web is geometry, not Cell Size.** It is a pixel number fed by three fixed presets, and the SVG endpoint has no size parameter. Cell Size as a person's choice exists only in the app ([ADR 0016](./docs/adr/0016-cell-size-is-a-named-choice-in-the-app-and-fixed-geometry-on-the-web.md)).
- **The SVG endpoint is not rate-limited, deliberately.** README embeds arrive through GitHub's shared image proxy, so a per-IP limit would throttle everyone at once ([ADR 0010](./docs/adr/0010-rate-limit-only-the-json-api.md)).
- **Anything you add under `web/src/pages` becomes a public URL.** Astro routes every non-`_` file there, `.md` included. That is how the pages-layer guide ended up served at `/CONTEXT` in production and the colocated route tests ended up as 500-ing endpoints with vitest bundled into the Worker. Route tests live in `_tests/`; the guide is 404'd by `AGENT_GUIDE_ROUTE` in `web/src/middleware.ts` ([ADR 0018](./docs/adr/0018-src-pages-is-a-public-namespace-not-a-folder.md)).
- **The SVG endpoint is the one route exempt from `Cross-Origin-Resource-Policy: same-origin`.** `EMBED_ROUTE`, which the middleware imports from `web/src/domain/value-objects/embed.ts`, matches `/user/<segment>.svg` and nothing else; widening it opts the whole namespace out of a policy the rest of the site relies on ([ADR 0017](./docs/adr/0017-the-svg-endpoint-opts-out-of-the-same-origin-resource-policy.md)).
- **The app has no build flavors.** The stage is chosen by which `dart-defines` file is passed, and `--flavor`
  fails because there is nothing for it to name: the two files differ by one key
  ([ADR 0022](./docs/adr/0022-the-app-has-no-build-flavors-and-the-stage-is-a-dart-defines-file.md)).
- **`noneLight` is app-only.** The web ignores the light-theme palette variant, because an embed cannot know the viewer's theme ([ADR 0012](./docs/adr/0012-light-theme-palette-variant-is-app-only.md)).

## Deploy

Web deploys to Cloudflare Workers via `ci.yml` (production on `main`, a per-PR preview otherwise). It is server-rendered because the SVG endpoint cannot be prerendered ([ADR 0007](./docs/adr/0007-server-rendered-web-app-on-the-edge.md)). The `changes` job counts `docs/**`, `shared/**` and `*.md` as web changes, so a docs-only push to `main` still redeploys production; that is the accepted price of the docs contract and the shared tokens both living outside `web/`. The app ships to Google Play via `release-app.yml` on manual dispatch with a track. The two components are released independently, which is why GitHub Environments are namespaced `<component>-<stage>` ([ADR 0001](./docs/adr/0001-monorepo-with-independently-released-components.md)); see the README for the mapping. A commit that touches both `app/` and `web/` is filed in both changelogs, because `semantic-release-monorepo` attributes by path and `main` takes squash merges. That is correct for a change which genuinely spans both clients, so it is a notice and not a gate: the `cross-package-notice` job in `commit-message.yml` comments on the pull request and does not block it.
