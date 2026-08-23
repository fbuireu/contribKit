# Contributing to ContribKit

Thanks for considering it. ContribKit is a monorepo with two clients over one domain (an Astro web app on
Cloudflare Workers and a Flutter mobile app), and most of what is unusual about contributing here comes from
that one fact. Read this before your first pull request; it will save you a rejected commit.

If you want the shape of the codebase rather than the process, that is [ARCHITECTURE.md](./ARCHITECTURE.md). If you
want the vocabulary, that is [CONTEXT.md](./CONTEXT.md).

## Code of Conduct

By participating you are expected to uphold the
[Code of Conduct](./CODE_OF_CONDUCT.md). In short:

- **Be respectful**: different viewpoints and experiences are valuable
- **Be constructive**: focus on what is best for the project
- **Be collaborative**: work together towards common goals
- **Be patient**: we all have different levels of experience

## How can I contribute?

### Reporting bugs

Check the existing issues first, then use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml). Include:

- **Which client**: web, app, or both. They are separate implementations and a bug in one is usually not in the other.
- **What you did**, what you expected, and what actually happened.
- **The username and year** you were looking at, if the bug involves real contribution data.
- **Environment**: browser and OS for the web; device, OS version and app version for the app.

Security issues go through the [security report template](.github/ISSUE_TEMPLATE/security_report.yml), not a public
bug report.

### Suggesting features

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.yml). Say which client it is for, and why: a
feature that only makes sense on one client is fine and common. Two are already closed by decision rather than
effort: tips will never unlock anything ([ADR 0009](./docs/adr/0009-tips-are-unconditional-and-unlock-nothing.md)),
and the SVG endpoint will not be rate-limited
([ADR 0010](./docs/adr/0010-rate-limit-only-the-json-api.md)).

### Improving documentation

Always welcome, and here it is real work rather than a consolation prize. The source carries **no comments at
all** by design, doc comments included, so the documents are where the explanation lives
([ADR 0021](./docs/adr/0021-the-source-carries-no-comments-and-the-documents-carry-the-reasons.md)). Use the
[documentation template](.github/ISSUE_TEMPLATE/documentation.yml). Fair game: the READMEs, the
[wiki](./docs/wiki/), the per-layer `CLAUDE.md` files, and the glossary.

## Getting set up

**Pinned versions: match them exactly.** A mismatch is not a warning here, it is a failed `pub get` or a lockfile
conflict.

| Tool | Version | Pinned in |
| --- | --- | --- |
| pnpm | 11.21.0 | root `packageManager`, and nowhere else: always pnpm, never npm or yarn |
| Node | 26.7.0 | root `engines`, `web/engines` and `web/.nvmrc`: the same version in all three |
| Flutter | 3.47.0 | `app/pubspec.yaml` |
| Dart | 3.13.0 | `app/pubspec.yaml` |

Do not "fix" a version mismatch by editing the pin.

```bash
git clone https://github.com/YOUR_USERNAME/contribKit.git
cd contribKit

pnpm install                         # root tooling, git hooks and the web workspace

cd app && flutter pub get            # only if you are touching the app
```

### Working on the web

```bash
cd web
pnpm dev                  # astro dev --open
pnpm wrangler:dev         # build + wrangler dev, against the real Workers runtime
pnpm test:ut                 # vitest, including the docs contract
pnpm test:docs            # the docs contract alone
pnpm test:e2e             # playwright
pnpm lint:all             # biome lint
pnpm format:all           # biome check --write
pnpm format:check         # biome check, read-only: what CI runs
pnpm typecheck    # wrangler types + tsc --noEmit
pnpm verify       # format:check + typecheck + coverage — what CI and pre-push run
```

### Working on the app

```bash
cd app
flutter analyze           # must be clean; CI runs --fatal-infos
flutter test
dart run build_runner build   # after touching any @freezed, @riverpod or DTO class
```

There are **no build flavors**. The stage comes from which dart-defines file you pass
(`dart-defines.json` or `dart-defines.prod.json`); `--flavor` will fail
([ADR 0022](./docs/adr/0022-the-app-has-no-build-flavors-and-the-stage-is-a-dart-defines-file.md)). Forgetting the
flag is not an error either: `REVENUECAT_KEY` comes back empty and the Tip Jar renders as unavailable.

### Working on the shared tokens

Edit `shared/*.json`, and never `app/assets/*.json`, which is a generated copy
([ADR 0002](./docs/adr/0002-shared-design-tokens-mirrored-into-the-flutter-bundle.md)). Run `pnpm sync:assets` from
the root, or just commit: a pre-commit hook syncs and stages them for you. Anything you add also has to be
advertised in the README's feature list, and the docs test will tell you if you forget.

## Code conventions

- **One argument is positional and two or more are a single object typed `<FunctionName>Params`** —
  `render({ shape, overrides }: RenderParams)`. The exception is a function a runtime calls back, such as
  a `sort` comparator, which is handed its arguments one at a time.
- **No code comments**, doc comments included. The `CLAUDE.md` guides carry the explanation.

## Commit rules

Conventional Commits, enforced by commitlint on `commit-msg`. semantic-release owns versioning, so the type you
choose is the version bump you get.

| Type | Bump | Example |
| --- | --- | --- |
| `feat` | minor | `feat(contribkit-web): add a hex cell shape` |
| `fix` | patch | `fix(contribkit-app): keep the cached calendar after a palette rename` |
| `perf` | patch | `perf(contribkit-web): reuse the parsed grid across renders` |
| `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `build` | none | `docs: correct the grid constant names` |

Breaking changes take a `!` after the type or a `BREAKING CHANGE:` footer, and bump the major.

**A scope, if you use one, must be a workspace package name.** `@commitlint/config-pnpm-scopes` derives the allowed
set from `pnpm-workspace.yaml`, so the scopes are `contribkit-web`, `contribkit-app` and `global`. **`feat(web):`
and `fix(app):` are rejected.** The scope is optional; `docs:` with none is always fine. Use `global` for a change
that belongs to neither client: CI, the root manifests, the docs contract.

**The hook is not the only place this runs, because the hook is not where most commits are written.** `commit-msg`
lints what you type locally; a squash-merge through GitHub commits the **pull request title**, which never passes
through any local hook. That is how `ci(web):` reached `main` twice while this document said it was rejected.
`commit-message.yml` lints the PR title on every open and edit, so the message that actually lands is the one that
was checked. It matters because semantic-release parses these to decide the version and which component's
changelog the entry goes in.

### One pull request, one client, usually

`semantic-release-monorepo` files a commit in the changelog of every package whose files it touched, and `main`
takes squash merges, so a pull request spanning `app/` and `web/` lands as one commit in both changelogs and can
cut both releases. Keep a pull request to one client where you can:

```bash
git add web/ && git commit -m "feat(contribkit-web): ..."
git add app/ && git commit -m "feat(contribkit-app): ..."
```

**This is a notice, not a gate.** The `cross-package-notice` job in `ci.yml` comments on the pull
request and does not block the merge, because a change that genuinely spans both clients is legitimate and
releasing both is then the right outcome. It ignores `app/assets/`, so the pre-commit sync's own mirrors cannot
make a `shared/` edit look like a cross-package one.

A local `commit-msg` hook used to reject the mixed commit outright. It was removed because splitting locally does
not survive the squash: ten commits on `main` touch both packages despite it.

Changes to `shared/`, `docs/` or the root touch neither package, so they release nothing.

Do **not** add a `Co-Authored-By` trailer for an AI assistant to a commit or a pull request.

## The maintenance contract

This is the part most likely to fail your pull request, so it is worth stating plainly: **when you change code, you
update the docs in the same commit.** A follow-up commit is a promise, not a fix.

| Document | Answers | Update it when |
| --- | --- | --- |
| [`CONTEXT.md`](./CONTEXT.md) | *What does this word mean?* A glossary and nothing else: no filenames, no libraries | A domain term changes meaning, or a new one appears |
| [`CLAUDE.md`](./CLAUDE.md) | *How do I work in this repo?* Commands, conventions, the full update table | You change a script, a convention, or a repo-wide invariant |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | *How does it fit together?* Layer map, a request end to end, build and release, the ADR index | You change the layering, a flow, or the pipeline |
| `web/src/<layer>/CLAUDE.md`, `app/lib/<layer>/CLAUDE.md` | *What does this layer guarantee?* | You change a rule the guide states |
| [`docs/adr/`](./docs/adr/) | *Why is it like this?* One decision per file | You make a decision that is hard to reverse, surprising without context, **and** the result of a real trade-off |
| [`docs/wiki/`](./docs/wiki/) | The published user-facing wiki | You change behaviour a reader would notice |

The glossary is **prescriptive**. If the code says something a `CONTEXT.md` `_Avoid_` list names, the code is what
is wrong. Do not edit the glossary to match a stale identifier.

`docs/docs-consistency.test.ts` enforces the mechanical half. `ci.yml` runs it in a `Docs Contract` job that is **not** gated on which client changed, and `ci.yml` itself has no path filter, so it fires on every push and pull request. It used to be two path-filtered workflows with a copy of the job in each, and three times a change landed that the contract asserts about while starting no workflow at all. When it fails,
the docs and the code disagree; fix whichever is wrong. **Never delete an assertion to get green.** It cannot check
prose or rationale, so a green run is not a correct document.

Writing an ADR: copy [`0000-adr-template.md`](./docs/adr/0000-adr-template.md) to `NNNN-kebab-title.md` numbered one
above the highest existing file, fill in every section, add a row to the index in
[`ARCHITECTURE.md`](./ARCHITECTURE.md), and link it from wherever it actually bites. Both are asserted: an ADR only
the index points at will not be read.

## Pull requests

Before you open one:

1. The relevant checks pass: `pnpm verify` for the web,
   `flutter analyze && flutter test` for the app.
2. `pnpm test:docs` passes, whichever client you touched.
3. Commits follow the rules above, including the one-client rule.
4. The documents the contract names are updated in the same commits.

Title the pull request the way you would title a commit. CI will run the component's workflow, deploy a preview
Worker for web changes and comment the URL on the pull request, and run Playwright against that preview.

### What happens after merge

Nothing needs doing by hand. The two components release independently
([ADR 0001](./docs/adr/0001-monorepo-with-independently-released-components.md)):

- **Web**: merging to `main` runs semantic-release (`web-vX.Y.Z`) and deploys to Cloudflare Workers.
- **App**: releases are a manual `release-app.yml` dispatch with a Google Play track, so an app change sits on
  `main` until the maintainer ships it.

A docs-only push to `main` also redeploys the web Worker. That is expected: `ci.yml`'s `changes` job counts
`docs/**` and `*.md` as web changes, because the shared tokens and the docs contract both live outside `web/`,
and the deploy is idempotent.

## Use of AI

If you use AI tools when contributing:

- **Review everything it produces.** You are responsible for what you submit.
- **Check its claims against the code.** The documents here have already carried an ADR asserting an exhaustive
  match that a wildcard had disabled, and a launch year that was wrong by three. A doc claim nobody verified is a
  doc claim that is wrong.
- **Disclose significant use** in the pull request description.
- **Do not add a Claude or Copilot co-author trailer** to commits or pull requests.

## Questions

- **Issues**: <https://github.com/fbuireu/contribKit/issues>
- **Wiki**: <https://github.com/fbuireu/contribKit/wiki>
- **Security**: [SECURITY.md](.github/SECURITY.md)
