# 1. The components share a repository but not a release

Date: 2026-07-26

## Status

Accepted.

## Context

ContribKit ships the same domain twice: an Astro site on Cloudflare Workers and a Flutter app on two stores. Both draw the same calendar, from the same palettes, with the same shapes. Split across repositories, a palette change becomes a cross-repo dance with a window in which the two products disagree about what "Nord" means.

Sharing a repository invites the opposite mistake: one version, one pipeline, one release. That does not survive contact with the stores: a web deploy is minutes and reversible, a mobile release is store review and is not.

## Decision

One repository, releases per component. `semantic-release` runs separately for each with its own tag series (`web-vX.Y.Z`, `app-vX.Y.Z`, configured in `web/.releaserc.json` and `app/.releaserc.json`), and CI is path-filtered so `ci-web.yml` and `ci-app.yml` only run when their component changes.

The rejected alternative is a single version for the monorepo. It would force a mobile release for every web copy fix, and tie the web's cadence to store review.

## Consequences

- GitHub Environments are repo-global, so they are namespaced `<component>-<stage>` (`web-production`, `app-development`) to keep component secrets apart. The component-scoped configs deliberately do not repeat the prefix: wrangler uses `[env.production]`, the app uses its `dart-defines` files.
- The two `development` stages mean different things: an internal Play track for the app, a per-PR preview Worker for the web. The mapping is in the README and reads as a typo if you do not know this.
- Path filtering is load-bearing and easy to get wrong. A guard that lives in one component but checks the whole repo does not run unless its triggers say so. See [15](0015-the-maintenance-contract-is-enforced-by-a-test.md).
