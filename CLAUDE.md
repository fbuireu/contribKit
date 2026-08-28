# CLAUDE.md

Agent-facing guide for **ContribKit**: a GitHub contribution calendar you can view, customize, export, embed, or pin to a phone's home screen. See [CONTEXT.md](./CONTEXT.md) for the domain glossary (Contribution Day, Cell, Palette, Tip, and the names to avoid); do not duplicate it here. [ARCHITECTURE.md](./ARCHITECTURE.md) is the big picture: the layer map for both clients, a request end to end, the failure sets, build and release, and the ADR index. Human-facing setup and commit rules are [CONTRIBUTING.md](./CONTRIBUTING.md).

## What this is

A monorepo with two clients over one domain. **`web/`** is an Astro 7 SSR site on Cloudflare Workers that also serves the public SVG and JSON endpoints. **`app/`** is a Flutter iOS/Android app with home-screen widgets. **`shared/`** holds the design tokens both consume. Neither client needs a GitHub token: both read the public contributions page. See [ADR 0005](./docs/adr/0005-scrape-githubs-public-contributions-html.md).

## Stack

- **web**: Astro 7.2 (`output: "server"`), `@astrojs/cloudflare`, TypeScript, Biome, Vitest, Playwright
- **app**: Flutter 3.47.0 / Dart 3.13.0, Riverpod + `riverpod_generator`, `freezed`, Hive (cache + settings), RevenueCat, `home_widget` + `workmanager`
- **shared**: plain JSON, imported by web at build time and mirrored into [`app/assets/`](./app/assets) ([ADR 0002](./docs/adr/0002-shared-design-tokens-mirrored-into-the-flutter-bundle.md))
- **repo**: pnpm workspaces, lefthook, commitlint, semantic-release per component

## Versions (pinned: match exactly)

- pnpm **11.21.0**: always pnpm, never npm/yarn. The root `packageManager` is the **only** pin: it is what
  `pnpm/action-setup` resolves everywhere it runs, because [`release-app.yml`](./.github/workflows/release-app.yml) passes
  `package_json_file: package.json` explicitly, and the `prepare-env` composite action passes nothing, which
  defaults to the same root manifest. [`ci.yml`](./.github/workflows/ci.yml) used to be a third case: its
  `release` job set up pnpm, Node and two installs by hand, which was the composite written out again against
  one lockfile, so it did the same install twice and skipped the `.nvmrc` guard. It calls the composite now. [`app/package.json`](./app/package.json) deliberately declares none, which a docs guard asserts.
  It used to carry the second pin, and because Renovate's `includePaths` did not list the root manifest, that copy
  was the one it kept current. Consolidating onto the root pin silently rolled the package manager back three
  minors, until this was caught and the root was bumped to match
- Node **26.7.0**, stated three times and always the same: the root `engines`, `web/engines` and [`web/.nvmrc`](./web/.nvmrc), which
  is the one CI installs. They used to differ (v26.3.0 at the root against 26.5.1 in web) for no recorded reason.
- Flutter **3.47.0**, Dart **3.13.0** ([`app/pubspec.yaml`](./app/pubspec.yaml)). A mismatched local Flutter blocks `pub get` and codegen; do not "fix" it by editing the pin.

## Commands

```bash
pnpm sync:assets                 # copy shared/*.json into app/assets (also runs on commit)

# web/: run from web/
pnpm dev                         # astro dev --open
pnpm build                       # astro build
pnpm wrangler:dev                # build + wrangler dev (real Workers runtime)
pnpm typecheck           # wrangler types + tsc --noEmit
pnpm verify              # format:check + typecheck + coverage: what CI and pre-push run
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

Both clients use the same layered architecture with a strict inward dependency direction ([ADR 0003](./docs/adr/0003-layered-domain-architecture-in-both-clients.md)). Web aliases ([`web/tsconfig.json`](./web/tsconfig.json)): `@shared/* @domain/* @application/* @infrastructure/* @ui/*`. Prefer aliases over relative paths.

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
- **One argument is positional; two or more are one object, typed `<FunctionName>Params`.**
  `paletteByKey(key)`, `toIsoDate(date)`; `render({ shape, overrides }): RenderParams`,
  `walk({ dir, match }): WalkParams`. The interface is named after the function, not after the concept,
  so a reader landing on the type knows what takes it. Two adjacent arguments of the same type are what a
  caller transposes with nothing to catch it. A function a *runtime* calls back and hands its arguments
  one at a time (a `sort` comparator, a class given to `vi.stubGlobal`) is the exception.
- **No code comments**, of any kind, doc comments included. Rationale belongs in commit messages, ADRs, or a
  folder's guide, never inline ([ADR 0021](./docs/adr/0021-the-source-carries-no-comments-and-the-documents-carry-the-reasons.md)).
- **Errors are a sealed, typed set.** Returned as values on the web, thrown and matched without a wildcard in the app ([ADR 0004](./docs/adr/0004-typed-failures-instead-of-thrown-exceptions.md)). Never widen a match with `_` to silence the compiler.
- **Never invent data for the user.** An unknown Count is not zero, and must not be estimated, summed, or displayed as exact.
- **Edit `shared/`, never `app/assets/`.** The copies are generated.
- **Conventional commits** (commitlint + lefthook). semantic-release owns versioning. Do NOT add a Co-Authored-By / Claude trailer to commits or PRs.

## Maintenance contract

These documents are not generated. A change that does not update them leaves the tree describing code that no longer exists, so when you change code, update the docs **in the same commit**. A follow-up commit is a promise, not a fix.

[`docs/docs-consistency.test.ts`](./docs/docs-consistency.test.ts) makes the mechanical half executable: it reads every document as data and asserts the checkable claims against the repo. It runs with `pnpm test:ut`, and on its own with `pnpm test:docs`.

| It asserts | Worth knowing |
| --- | --- |
| Every relative link, `../../wiki/` shorthand and cited source path resolves | |
| No `file.ts:123` citation anywhere | they rot the moment anything above them moves, so name the symbol instead |
| The ADR set holds its template | sequential numbering from 0000, `NNNN-kebab-title.md`, the `# N. Title` / Date / Status / *Context* / *Decision* / *Consequences* shape, a row in the [`ARCHITECTURE.md`](./ARCHITECTURE.md) index, and a link from some document **other** than that index |
| `shared/*.json` equals its mirror in `app/assets/` | normalised for trailing whitespace as well. **Every file the contract reads is normalised for line endings**, in `read` itself: a Windows clone with `core.autocrlf=true` used to fail two ADR assertions that compare a heading against a stored title, which is a guard failing for a non-reason |
| The README's feature *line* names every palette and shape shipped | the line, not the file: `GitHub` and `square` occur elsewhere in the README and made the old whole-file check unfailable |
| Every pinned version matches the manifest that pins it, and exactly one manifest pins pnpm | |
| Every documented `pnpm` script is declared in a [`package.json`](./package.json) | read from code spans, so prose saying "the pnpm and Node pins" is not mistaken for a command |
| Every source layer carries a nested `CLAUDE.md`, listed in both maps, with no stray `CONTEXT.md` outside the root | |
| Nothing under [`web/src/pages`](./web/src/pages) becomes a public URL by accident | [ADR 0018](./docs/adr/0018-src-pages-is-a-public-namespace-not-a-folder.md) |
| Every bare filename a guide cites still exists | searched across [`app/lib`](./app/lib), [`app/test`](./app/test), [`web/src`](./web/src), [`web/e2e`](./web/e2e) and [`web/workers`](./web/workers): a guide pointing at the test that pins a rule is citing the most useful file it could |
| Every glossary term is used somewhere outside the glossary | |
| No identifier is named after a word a glossary `_Avoid_` list rejects | narrower than it sounds: see below |
| No `//` **or `/* */`** comment in any hand-written source | `app/lib`, `app/test`, `web/src`, `web/e2e`, `web/workers`, `docs/`, `scripts/` and the three `web/*.config.ts`. The exception list is exactly `// @vitest-environment` and `/// <reference>`, the two the runner reads, so a `///` Dart doc comment or a `// @TODO` is caught like any other. The block form was invisible for a year |
| The web layers import only inwards | over `.astro` as well as `.ts`, and over every import form rather than `from "…"` alone: that hole is how a marketing component reached around the domain and counted the raw token JSON instead of the filtered `CELL_SHAPES` |
| `shadcn_ui` stays inside [`app/lib/ui/widgets/`](./app/lib/ui/widgets), the theme and the composition root | |
| **Two things written more than once stay identical** | the Embed contract in Dart and TypeScript, and the dark palette in its two CSS blocks. A third used to be here, the web path filter written across three workflows, and it is gone because the filters are gone: one unfiltered `ci.yml` replaced them |
| Every `tail_consumers` entry names the Worker [`web/workers/tail/wrangler.toml`](./web/workers/tail/wrangler.toml) declares | a rename in either file stops log forwarding, and until 2026-08-28 it did so with no error anywhere, because nothing deployed that Worker from CI. `ci.yml`'s `deploy-tail` job does now, and `deploy-production` needs it, so the name is resolved at deploy time as well as asserted here |

**The glossary guard polices far less than its name suggests, deliberately.** It covers the code-shaped terms (`ShapeKind`, `DOW`, `IAP`, `SKU`) anywhere, plus a curated set of plain words (`purchase`, `paywall`, `heatmap`, `donation`, `density`, …) in `.ts` and `.dart` with string literals stripped, so it reads identifiers rather than prose. **A policed word counts as a camelCase segment, not only as a whole token**: the boundary used to be `(?<![A-Za-z0-9])word(?![A-Za-z0-9])`, so `cellDensity` and `densityScale` were both invisible, and the guard was green for the same accidental reason that let `Purchases` sit outside `SDK_SEAMS` for a year. It now also matches a word preceded by a lowercase letter, digit or underscore, while still letting a genuine longer word through (`purchases`, `bucketed`). A companion assertion proves every policed word is one `CONTEXT.md` actually rejects, so the list cannot invent a rule. It is not all 106 terms and cannot be: most are ordinary English (`value`, `range`, `save`) that any codebase uses honestly, and some name a platform API rather than our vocabulary: `showPopover` is the HTML Popover API, not a Cell Tooltip called the wrong thing. For the same reason `SDK_SEAMS` exempts the two files that speak to the store SDK, whose job is to talk the vendor's language on one side and the glossary's on the other; a third assertion caps that list at two and checks each file still exists, so the exemption cannot quietly grow. `store_error.dart` was the second one for a year without being listed: the glossary guard passed it not because the rule allowed it but because the policed word is `purchase` with a boundary on both sides, and `Purchases`, `PurchasesErrorCode` and `purchaseCancelledError` all carry a trailing alphanumeric. The stripper removes Dart raw strings before escape sequences and works one line at a time, so a regex literal cannot break quote pairing for the rest of a file.

A failure means the docs and the code disagree: fix whichever is wrong, and **never delete an assertion to make it pass**. It cannot check prose or rationale; that part is still on you. Keep its assertions aggregated (one failing list per rule) rather than one case per document.

| If you change | Update |
| --- | --- |
| What a domain word means, or introduce a new one | [`CONTEXT.md`](./CONTEXT.md): vocabulary only, no implementation |
| An identifier that a glossary `_Avoid_` list forbids | the code, not the glossary |
| A folder's layout or a rule its guide states | that folder's `CLAUDE.md` (table above) |
| A palette, shape, or suggested username | `shared/*.json`, then `pnpm sync:assets`, then the README's feature list |
| How contributions are fetched or parsed | **both** clients: the parser is duplicated on purpose ([ADR 0011](./docs/adr/0011-keep-the-apps-own-scraper-for-now.md)) |
| A public endpoint's behaviour or caching | [`web/README.md`](./web/README.md) and [`docs/wiki/API-Reference.md`](./docs/wiki/API-Reference.md) |
| A `Failure` kind | the exhaustive match that renders it, and [ADR 0004](./docs/adr/0004-typed-failures-instead-of-thrown-exceptions.md) if the contract itself moved |
| A stored Hive key | add a legacy fallback and a migration test, or users silently lose the setting |
| A decision an ADR records | that ADR: amend it, or supersede it and say so in both `## Status` blocks |
| The layer map, a run end to end, or the release pipeline | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| A claim the docs-consistency test asserts, on purpose | the doc first; the test only when the claim itself changed |

Propose an ADR in [`docs/adr/`](./docs/adr/) when a decision is **hard to reverse**, **surprising without context**, and **the result of a real trade-off**. All three, or it is not an ADR. Copy [`0000-adr-template.md`](./docs/adr/0000-adr-template.md) to `NNNN-kebab-title.md`, numbered one above the highest existing file; the `# N. Title` heading carries that same number, and Date / Status / Context / Decision / Consequences are all required. Add a row to the index in [`ARCHITECTURE.md`](./ARCHITECTURE.md) **and** link it from wherever it bites: a gotcha here, a nested guide, a wiki page. Both are asserted, because an ADR only the index points at will not be read. Refer to one as `ADR 0007`, never `ADR 7`: the four-digit form is what the dangling-reference guard can see.

Three traps worth naming, because all three have already happened here:

- **A rename is not done until the storage key, the background isolate, and the generated code agree.** [`main.dart`](./app/lib/main.dart)'s WorkManager isolate used to read Hive directly, so it survived renames and drifted silently; it now goes through `HiveSettingsRepository` like everything else, which is what makes a renamed key a compile error there rather than a widget that quietly stops updating.
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
- **The app's grid covers the year, which is 53 weeks or, twice this century, 54.** Dates outside the requested year are padded as empty days. A leap year opening on a Saturday needs 372 cells and 53×7 is 371, so 2028 and 2056 take a 54th week; `ContributionGridService.weeksFor` is the only answer, and nothing may assume a constant ([ADR 0023](./docs/adr/0023-the-app-grid-covers-the-year-in-53-or-54-weeks.md)).
- **The cache is versioned.** Changing what a cached calendar means requires bumping `_cacheBoxName`; past-year entries never expire on their own ([ADR 0014](./docs/adr/0014-cached-calendars-are-versioned.md)).
- **The parser uses regexes on purpose.** There is no DOM in a Worker; do not "upgrade" it to an HTML parser ([ADR 0006](./docs/adr/0006-parse-the-contributions-page-with-regexes.md)).
- **Tips unlock nothing.** No code may start checking purchase state ([ADR 0009](./docs/adr/0009-tips-are-unconditional-and-unlock-nothing.md)).
- **`cellSize` on the web is geometry, not Cell Size.** It is a pixel number fed by three fixed presets, and the SVG endpoint has no size parameter. Cell Size as a person's choice exists only in the app ([ADR 0016](./docs/adr/0016-cell-size-is-a-named-choice-in-the-app-and-fixed-geometry-on-the-web.md)).
- **The SVG endpoint is not rate-limited, deliberately.** README embeds arrive through GitHub's shared image proxy, so a per-IP limit would throttle everyone at once ([ADR 0010](./docs/adr/0010-rate-limit-only-the-json-api.md)).
- **Anything you add under `web/src/pages` becomes a public URL.** Astro routes every non-`_` file there, `.md` included. That is how the pages-layer guide ended up served at `/CONTEXT` in production and the colocated route tests ended up as 500-ing endpoints with vitest bundled into the Worker. Route tests live in `_tests/`; the guide is 404'd by `AGENT_GUIDE_ROUTE` in [`web/src/middleware.ts`](./web/src/middleware.ts) ([ADR 0018](./docs/adr/0018-src-pages-is-a-public-namespace-not-a-folder.md)).
- **The SVG endpoint is the one route exempt from `Cross-Origin-Resource-Policy: same-origin`.** `EMBED_ROUTE`, which the middleware imports from [`web/src/domain/value-objects/embed.ts`](./web/src/domain/value-objects/embed.ts), matches `/user/<segment>.svg` and nothing else; widening it opts the whole namespace out of a policy the rest of the site relies on ([ADR 0017](./docs/adr/0017-the-svg-endpoint-opts-out-of-the-same-origin-resource-policy.md)).
- **The app has no build flavors.** The stage is chosen by which `dart-defines` file is passed, and `--flavor`
  fails because there is nothing for it to name: the two files differ by one key
  ([ADR 0022](./docs/adr/0022-the-app-has-no-build-flavors-and-the-stage-is-a-dart-defines-file.md)).
- **`noneLight` is app-only.** The web ignores the light-theme palette variant, because an embed cannot know the viewer's theme ([ADR 0012](./docs/adr/0012-light-theme-palette-variant-is-app-only.md)).

## Deploy

**The deploy names its wrangler environment, and for a long time it did not.** `web/wrangler.toml` keeps
everything but the assets binding under `[env.production]` and `[env.development]`: the two custom domains,
the `API_RATE_LIMITER` rate limit, observability, smart placement and the `contribkit-tail` tail consumer.
`_deploy.yml` derives the stage from the GitHub Environment and passed it to the **build** as
`CLOUDFLARE_ENV` and to nothing else, so `wrangler deploy` ran with no environment selected and shipped the
bare top level. Everything in those two blocks was configuration that never reached a Worker, and the
[API rate limit](./docs/adr/0010-rate-limit-only-the-json-api.md) in particular existed only in the file:
`env.API_RATE_LIMITER` was `undefined` in production and the middleware skipped it. The deploy passes
`--env` now. `CLOUDFLARE_ENV` on the build step stays, because that is Astro's build-time switch, not
wrangler's.

**`smoke` is the only job that ever touches production, and until it existed nothing did.** `E2E (preview)`
needs `deploy-development`, which runs on `pull_request` only, so a push to `main` deployed production, cut a
`web-v*` tag and made no request to `https://contribkit.app` at all. Worse, `release` needed only `web-ci`, so
the tag, the GitHub release and the changelog entry did not even wait for the deploy: a failed deploy still
published a version. `release` needs `deploy-production` and `smoke` now, which is what makes a tag mean *the
version is live and answering*. Both the deploy and the smoke run take the address from the **`SITE_URL` repository variable** rather than
repeating the domain, and a first step fails `smoke` when it is empty: Playwright falls back to
`http://localhost:4321` when `BASE_URL` is unset, and a smoke run against nothing is worse than none. It has to be a
**repository** variable rather than one on `web-production`: neither a job that declares no `environment:` nor a job
that calls a reusable workflow can read an environment-scoped `vars`, and both would see an empty string. It was
declared on the two `web-*` environments first, which is exactly how that was found. The build reads it as
`process.env.SITE_URL` in `astro.config.ts`, **not** `import.meta.env`: Astro exposes only `PUBLIC_`-prefixed names
through `import.meta.env`, so the first version of that line was undefined whatever the variable said and the site
silently kept the literal fallback. Verified by building with `SITE_URL=https://example.test` and reading the
emitted `sitemap-index.xml`: it says `example.test` now and `contribkit.app` with the variable unset. That is also
why the three analytics variables carry the `PUBLIC_` prefix and this one does not: they are read from
`import.meta.env` in app code, and this one is read in the config. The three cases tagged `@smoke` are the homepage, an unknown path and `/user/<name>.svg`; the last is the route
that [cannot be prerendered](./docs/adr/0007-server-rendered-web-app-on-the-edge.md), so it is the one that
distinguishes a running Worker from a bucket of assets. A smoke case can only assert what the deploy it follows has
already published, which is why none of them names a feature. The step passes no `--pass-with-no-tests`, because
Playwright exiting 1 on an empty set is the only thing keeping the tag honest.

**The smoke job labels its own report.** Playwright's `github` reporter annotates every run with the same
`🎭 Playwright Run Summary`, whichever suite produced it, so a step writes a *Production smoke tests* heading to
`$GITHUB_STEP_SUMMARY` first, naming the address it ran against and the sha it followed. The artifact is
`playwright-smoke-report` for the same reason.

**A failed smoke run rolls production back.** Withholding the tag leaves a version that does not answer serving
traffic, so `rollback` runs `wrangler rollback --env production --yes` from `web/` when `deploy-production`
succeeded and `smoke` failed, returning the Worker to the version that was live before. It is a separate job
because it needs the Cloudflare credentials and `smoke` deliberately has none. The cost is the obvious one: a smoke
case that fails for a reason outside the Worker now reverts a good deploy, which is the second reason
`/api/health` is out of the set and the rule for anything added to it.

**`Check` needed widening for any of that to be visible.** It aggregates the other jobs and is the only context the
ruleset names, and its `needs` list stopped at `e2e`: run 33237524280 reported a green `Check` beside a red run
whose `smoke` job had failed, which is how a broken push looks passing in the branch's checks.
`deploy-production` and `smoke` are in that list now. They are skipped on a pull request, and a skipped job is not
a failure, so nothing about the pull-request gate changes.

**`/api/health` was the fourth case and is not, because production answered it with HTML.** On the first run of this
job the other three passed and that one failed parsing `<!DOCTYPE …` as JSON. Nothing here renders HTML for that path:
the route sets `prerender = false` and returns `Response.json`, the middleware's only `/api/` branch returns a JSON
429, and the same spec passes against the preview Worker on every pull request. What differs in production is the zone,
not the code, and the case that passed beside it is the strongest evidence: `/user/<name>.svg` is server-rendered too,
so the Worker is running and routing. **A browser gets the JSON**, checked on 2026-08-29:
`{"status":"ok"}` with all four keys `true`, including the `API_RATE_LIMITER` binding that the `--env` fix above is
what supplies. So the JSON API is up and the zone answers a datacenter address differently from a person: a bot rule
on `/api/*`. Cloudflare's **Security Events** log names the rule that blocked a given request, which is where a fix
starts. Tag the case again once that rule stops matching.

Web deploys to Cloudflare Workers via `ci.yml` (production on `main`, a per-PR preview otherwise). It is server-rendered because the SVG endpoint cannot be prerendered ([ADR 0007](./docs/adr/0007-server-rendered-web-app-on-the-edge.md)). The `changes` job counts `docs/**`, `shared/**` and `*.md` as web changes, so a docs-only push to `main` still redeploys production; that is the accepted price of the docs contract and the shared tokens both living outside `web/`. The app ships to Google Play via `release-app.yml` on manual dispatch with a track. The two components are released independently, which is why GitHub Environments are namespaced `<component>-<stage>` ([ADR 0001](./docs/adr/0001-monorepo-with-independently-released-components.md)); see the README for the mapping. A commit that touches both `app/` and `web/` is filed in both changelogs, because `semantic-release-monorepo` attributes by path and `main` takes squash merges. That is correct for a change which genuinely spans both clients, so it is a notice and not a gate: the `cross-package-notice` job in `ci.yml` comments on the pull request and does not block it.
