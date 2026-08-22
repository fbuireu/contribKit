# 1. The components share a repository but not a release

Date: 2026-07-26

## Status

Accepted. Amended once, to record what attribution by path does to a commit that spans both components. That was never written down here; it lived as a local `commit-msg` hook that rejected such a commit, and as prose in four documents describing the hook.

## Context

ContribKit ships the same domain twice: an Astro site on Cloudflare Workers and a Flutter app on two stores. Both draw the same calendar, from the same palettes, with the same shapes. Split across repositories, a palette change becomes a cross-repo dance with a window in which the two products disagree about what "Nord" means.

Sharing a repository invites the opposite mistake: one version, one pipeline, one release. That does not survive contact with the stores: a web deploy is minutes and reversible, a mobile release is store review and is not.

## Decision

One repository, releases per component. `semantic-release` runs separately for each with its own tag series (`web-vX.Y.Z`, `app-vX.Y.Z`, configured in `web/.releaserc.json` and `app/.releaserc.json`), and CI is path-filtered so `ci-web.yml` and `ci-app.yml` only run when their component changes.

The rejected alternative is a single version for the monorepo. It would force a mobile release for every web copy fix, and tie the web's cadence to store review.

## Consequences

- GitHub Environments are repo-global, so they are namespaced `<component>-<stage>` (`web-production`, `app-development`) to keep component secrets apart. The component-scoped configs deliberately do not repeat the prefix: wrangler uses `[env.production]`, the app uses its `dart-defines` files.
- The two `development` stages mean different things: an internal Play track for the app, a per-PR preview Worker for the web. The mapping is in the README and reads as a typo if you do not know this.
- **A commit that touches both components is filed in both changelogs, and can cut both releases.** `semantic-release-monorepo` attributes by path, and `main` takes squash merges, so the unit being attributed is the whole pull request rather than the commits inside it.

  For a change that genuinely spans the two clients, releasing both is the right answer. So this is a notice rather than a gate: the `cross-package-notice` job in `ci.yml` comments on the pull request and does not block it. It ignores `app/assets/`, whose mirrors the pre-commit sync stages whenever `shared/*.json` changes.

  An `auto-scope` script used to reject the mixed commit on `commit-msg`. It was removed because it did not work and cost real friction: splitting locally does not survive the squash, and ten commits on `main` touch both components despite it. A gate would also have to refuse the legitimate case, and this repository has already had one such change.
- Path filtering is load-bearing and easy to get wrong. A guard that lives in one component but checks the whole repo does not run unless its triggers say so. See [15](0015-the-maintenance-contract-is-enforced-by-a-test.md).
