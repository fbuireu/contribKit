# Contributing to ContribKit

Thanks for considering it. ContribKit is a monorepo with two clients over one domain, an Astro web app on
Cloudflare Workers and a Flutter mobile app, and most of what is unusual about contributing here comes from
that one fact. Read this before your first pull request; it will save you a rejected commit.

If you want the shape of the codebase, that is [CLAUDE.md](../CLAUDE.md) and the nested guides it links, and
[ARCHITECTURE.md](../ARCHITECTURE.md) for the big picture. If you want the vocabulary, that is
[CONTEXT.md](../CONTEXT.md). If you want the *why*, that is [docs/adr/](../docs/adr/).

## Code of Conduct

By participating you are expected to uphold the [Code of Conduct](./CODE_OF_CONDUCT.md). In short:

- **Be respectful**: different viewpoints and experiences are valuable
- **Be constructive**: focus on what is best for the project
- **Be collaborative**: work together towards common goals
- **Be patient**: we all have different levels of experience

## How can I contribute?

### Reporting bugs

Check the existing issues first, then use the [bug report template](ISSUE_TEMPLATE/bug_report.yml). Include:

- **Which client**: web, app, or both. They are separate implementations and a bug in one is usually not in
  the other.
- **What you did**, what you expected, and what actually happened.
- **The username and year** you were looking at, if the bug involves real contribution data.
- **Environment**: browser and OS for the web; device, OS version and app version for the app.

Security issues go through the [Security Policy](./SECURITY.md), never a public issue.

### Suggesting features

Use the [feature request template](ISSUE_TEMPLATE/feature_request.yml). Say which client it is for, and why:
a feature that only makes sense on one client is fine and common. Check
[Discussions](https://github.com/fbuireu/contribKit/discussions) first; some ideas are already being talked
about, and two are already closed by decision rather than effort: tips will never unlock anything
([ADR 0009](../docs/adr/0009-tips-are-unconditional-and-unlock-nothing.md)), and the SVG endpoint will not be
rate-limited ([ADR 0010](../docs/adr/0010-rate-limit-only-the-json-api.md)).

### Improving documentation

Use the [documentation template](ISSUE_TEMPLATE/documentation.yml), or just open a pull request. Here it is
real work rather than a consolation prize: the source carries **no comments at all** by design, doc comments
included, so the documents are where the explanation lives
([ADR 0021](../docs/adr/0021-the-source-carries-no-comments-and-the-documents-carry-the-reasons.md)). The
user-facing documentation is the [wiki](../docs/wiki/), edited **in this repository** and published by
[`sync-wiki.yml`](./workflows/sync-wiki.yml) on every push touching it, so an edit made in the wiki UI is
overwritten on the next sync. The agent-facing guides (`CLAUDE.md` and friends) are held to the code by a
test, so read *The docs are part of the change* below before editing one.

## Getting started

**Pinned versions: match them exactly.** A mismatch is not a warning here, it is a failed `pub get` or a
lockfile conflict. The table names the file, not the number: read the pin from the file. A version written
here would go stale the next time a bot bumps it, and a check that defended it could only do so by failing
that bump.

| Tool | Pinned in |
| --- | --- |
| pnpm | root `packageManager`, and nowhere else: always pnpm, never npm or yarn |
| Node | root `engines`, `web/engines` and [`.nvmrc`](../.nvmrc): the same version in each |
| Flutter | `environment.flutter` in [`app/pubspec.yaml`](../app/pubspec.yaml), which CI installs from |
| Dart | not pinned: `environment.sdk` is a floor, and the Dart you get is the one your Flutter ships |
| Ruby | [`app/android/.ruby-version`](../app/android/.ruby-version), which `setup-ruby` reads for the fastlane run |

Do not "fix" a version mismatch by editing the pin.

```bash
git clone https://github.com/YOUR_USERNAME/contribKit.git
cd contribKit

# Always pnpm, never npm or yarn. This also installs the git hooks and the web workspace
pnpm install

cd app && flutter pub get            # only if you are touching the app
```

### Working on the web

```bash
cd web
pnpm dev                  # astro dev (dev:open appends --open)
pnpm wrangler:dev         # build + wrangler dev, against the real Workers runtime
```

### Working on the app

```bash
cd app
dart run build_runner build   # after touching any @freezed, @riverpod or DTO class
```

There are **no build flavors**. The stage comes from which dart-defines file you pass (`dart-defines.json`
or `dart-defines.prod.json`); `--flavor` will fail
([ADR 0022](../docs/adr/0022-the-app-has-no-build-flavors-and-the-stage-is-a-dart-defines-file.md)).
Forgetting the flag is not an error either: `REVENUECAT_KEY` comes back empty and the Tip Jar renders as
unavailable.

### Working on the shared tokens

Edit `shared/*.json`, and never `app/assets/*.json`, which is a generated copy
([ADR 0002](../docs/adr/0002-shared-design-tokens-mirrored-into-the-flutter-bundle.md)). Run
`pnpm sync:assets` from the root, or just commit: a pre-commit hook syncs and stages them for you. Anything
you add also has to be advertised in the README's feature list, and the docs test will tell you if you
forget.

## Checks

Everything CI runs, you can run locally. For the web, from `web/`:

```bash
pnpm lint:all             # biome lint over web, docs and .github (append :fix to autofix)
pnpm format:all           # biome check --write, the same three
pnpm typecheck            # wrangler types + tsc --noEmit
pnpm check                # astro check: the only thing that typechecks .astro files
pnpm test:ut              # vitest, the docs contract included
pnpm test:docs            # the docs contract alone
pnpm test:e2e             # playwright
pnpm verify               # format check, typecheck, astro check and coverage: what CI runs
```

For the app, from `app/`:

```bash
dart analyze              # must be clean; CI runs --fatal-infos
flutter test
flutter test --coverage && dart run tool/check_coverage.dart   # the floor CI and pre-push enforce
```

lefthook runs Biome and `dart format` on `pre-commit`, commitlint on `commit-msg`, and on `pre-push`
`pnpm verify:changed` for the web plus `dart analyze --fatal-infos` and the coverage run for the app, the
latter only when a Dart file, `pubspec.yaml` or `analysis_options.yaml` is in the push. The web hook runs the
changed-only variant rather than `verify` because the coverage floor and a subset run cannot both hold; CI
runs the full `pnpm verify` on the pushed sha, so a push whose coverage dropped still fails its check.
[CLAUDE.md](../CLAUDE.md) explains the trade.

[`app/analysis_options.yaml`](../app/analysis_options.yaml) sits well above `flutter_lints`, and the rules it
adds are the ones a reviewer would otherwise have to say out loud: `directives_ordering` and
`sort_constructors_first` so a file's shape is not a matter of who typed it, `unawaited_futures` so a dropped
`Future` is a compile-time complaint rather than a silent no-op, `avoid_positional_boolean_parameters` because
a bare `true` at a call site says nothing, and `use_colored_box` / `use_decorated_box` /
`sized_box_shrink_expand` / `avoid_unnecessary_containers` because a `Container` that only paints is a rebuild
nobody asked for. Two rules are deliberately **not** on: `avoid_redundant_argument_values` would rewrite
`DateTime(2026, 1, 1)` to `DateTime(2026)` and delete the `isDark: true` that records which ramp an export
renders, and `discarded_futures` fires on every `onPressed` that starts one, which is the shape the framework
asks for. `dart fix --apply` fixes most of what the rest catch, but read its diff: it moves a primary
constructor below the factories that call it, and both value objects it touched had to be put back by hand.

**It is `dart analyze`, and it used to be `flutter analyze`, and that difference turned fifteen rules off.**
`riverpod_lint` is installed through the `plugins:` block in
[`app/analysis_options.yaml`](../app/analysis_options.yaml), which is the `analysis_server_plugin` mechanism
its README documents. `dart analyze` loads that plugin; `flutter analyze` does not. A public property on a
generated `Notifier`, which `avoid_public_notifier_properties` exists to catch, was reported by one and passed
clean by the other, and CI, both hooks and every document ran the one that passed. The plugin's version there
is a **range** (`^3.1.0`) rather than the exact pin it used to be: the exact one said `3.1.3` while
`pubspec.yaml` resolved `3.1.8`, which is one fact written twice with two different answers and only one of
them kept current by a bot.

## Conventions that will bite you if you skip them

- **Use the glossary's words.** [CONTEXT.md](../CONTEXT.md) is prescriptive: if the code says something its
  `_Avoid_` list names, the code is what is wrong. Do not edit the glossary to match a stale identifier.
- **No code comments**, doc comments included. The `CLAUDE.md` guides carry the explanation.
- **One argument is positional and two or more are a single object typed `<FunctionName>Params`**:
  `render({ shape, overrides }: RenderParams)`. The exception is a function a runtime calls back, such as a
  `sort` comparator, which is handed its arguments one at a time.
- **Errors are a sealed, typed set.** Returned as values on the web, thrown and matched without a wildcard
  in the app. Never widen a match with `_` to silence the compiler.
- **Never invent data for the user.** An unknown Count is not zero, and must not be estimated, summed, or
  displayed as exact.
- **Edit `shared/`, never `app/assets/`.** The copies are generated.

## Commit rules

Conventional Commits, enforced by commitlint on `commit-msg`. semantic-release owns versioning, so the type
you choose is the version bump you get.

| Type | Bump | Example |
| --- | --- | --- |
| `feat` | minor | `feat(contribkit-web): add a hex cell shape` |
| `fix` | patch | `fix(contribkit-app): keep the cached calendar after a palette rename` |
| `perf` | patch | `perf(contribkit-web): reuse the parsed grid across renders` |
| `revert` | patch | `revert: feat(contribkit-web): add a hex cell shape` |
| `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `build` | none | `docs: correct the grid constant names` |

Breaking changes take a `!` after the type or a `BREAKING CHANGE:` footer, and bump the major.

**A scope, if you use one, must be a workspace package name.** `@commitlint/config-pnpm-scopes` derives the
allowed set from [`pnpm-workspace.yaml`](../pnpm-workspace.yaml), so the scopes are `contribkit-web`,
`contribkit-app` and `global`. **`feat(web):` and `fix(app):` are rejected.** The scope is optional; `docs:`
with none is always fine. Use `global` for a change that belongs to neither client: CI, the root manifests,
the docs contract.

**`main` takes squash merges, so the pull request title is the commit that lands.** The `commit-msg` hook
lints what you type locally, and [`commit-message.yml`](./workflows/commit-message.yml) lints the pull
request title on every open and edit, because that title is what semantic-release parses to decide the
version and which component's changelog the entry goes in. That is how `ci(web):` reached `main` twice while
this document said it was rejected. Title the pull request the way you would title a commit.

### One pull request, one client, usually

`semantic-release-monorepo` files a commit in the changelog of every package whose files it touched, and
`main` takes squash merges, so a pull request spanning `app/` and `web/` lands as one commit in both
changelogs and can cut both releases. Keep a pull request to one client where you can. **This is a notice,
not a gate.** The `cross-package-notice` job in [`ci.yml`](./workflows/ci.yml) comments on the pull request
and does not block the merge, because a change that genuinely spans both clients is legitimate and releasing
both is then the right outcome. It ignores [`app/assets/`](../app/assets), so the pre-commit sync's own
mirrors cannot make a `shared/` edit look like a cross-package one.

Changes to `shared/`, `docs/` or the root touch neither package, so they release nothing.

Do **not** add a `Co-Authored-By` trailer for an AI assistant to a commit or a pull request.

## The docs are part of the change

This repo treats its documentation as part of the code: change one, update the other **in the same
commit**. A follow-up commit is a promise, not a fix.
[`docs/docs-consistency.test.ts`](../docs/docs-consistency.test.ts) runs with the unit tests and fails the
build when the docs and the repo disagree. `ci.yml` runs it in a `Docs Contract` job that is **not** gated on
which client changed, so it fires on every push and pull request. When it fails, fix whichever side is
wrong, and **never delete an assertion to get green**. It cannot check prose or rationale, so a green run is
not a correct document. [CLAUDE.md](../CLAUDE.md) has the full table of what to update for a given change,
and [ARCHITECTURE.md](../ARCHITECTURE.md) holds the ADR index.

Writing an ADR: copy [`0000-adr-template.md`](../docs/adr/0000-adr-template.md) to `NNNN-kebab-title.md`
numbered one above the highest existing file, fill in every section, add a row to the index in
[`ARCHITECTURE.md`](../ARCHITECTURE.md), and link it from wherever it actually bites. Both are asserted: an
ADR only the index points at will not be read.

## Pull requests

1. Fork, branch from `main`, make the change.
2. Run the checks above; fill in the pull request template, GIF included. `pnpm test:docs` passes whichever
   client you touched.
3. CI deploys a per-PR preview Worker for web changes and comments its URL on the pull request, so reviewers
   can try the change live. The E2E suite runs against the preview and gates the merge.
4. After merge to `main`, nothing needs doing by hand. The two components release independently
   ([ADR 0001](../docs/adr/0001-monorepo-with-independently-released-components.md)): the web releases and
   deploys through semantic-release (`web-vX.Y.Z`), cut only after the production deploy and its smoke run
   pass; the app releases through a manual [`release-app.yml`](./workflows/release-app.yml) dispatch with a
   Google Play track, so an app change sits on `main` until the maintainer ships it. A docs-only push to
   `main` also redeploys the web Worker: `ci.yml`'s `changes` job counts `docs/**` and `*.md` as web changes,
   because the shared tokens and the docs contract both live outside `web/`, and the deploy is idempotent.

## Use of AI

If you use AI tools when contributing:

- **Review everything it produces.** You are responsible for what you submit.
- **Check its claims against the code.** The documents here have already carried an ADR asserting an
  exhaustive match that a wildcard had disabled, and a launch year that was wrong by three. A doc claim
  nobody verified is a doc claim that is wrong.
- **Disclose significant use** in the pull request description.
- **Do not add a Claude or Copilot co-author trailer** to commits or pull requests.

## Questions

- **Issues**: <https://github.com/fbuireu/contribKit/issues>
- **Discussions**: <https://github.com/fbuireu/contribKit/discussions>
- **Wiki**: <https://github.com/fbuireu/contribKit/wiki>
- **Security**: [SECURITY.md](./SECURITY.md)

Thanks for contributing! 🎉
