# 2. Design tokens are defined once and mirrored into the Flutter bundle

Date: 2026-07-26

## Status

Accepted.

## Context

Palettes, cell shapes and suggested usernames have to be identical in both clients or the product contradicts itself. The same palette key painting different colours on web and phone is the kind of bug nobody files and everybody notices.

Defining them once is obvious. Where to put them is not: the web can import a JSON file from anywhere in the repo at build time, but Flutter can only bundle assets that live inside its own package. There is no path both toolchains read from directly.

## Decision

`shared/*.json` is the source of truth. The web imports it through the `@shared` alias at build time. The app consumes generated copies under `app/assets/`, produced by [`scripts/sync-shared-assets.mjs`](../../scripts/sync-shared-assets.mjs): on commit via the lefthook `sync-shared-assets` hook whenever a `shared/*.json` is staged, and on demand with `pnpm sync:assets`. The app release workflow re-copies the same files inline rather than invoking the script, so a release cannot ship stale assets even if someone commits without the hook.

Publishing the tokens as a package consumable by both toolchains was rejected as disproportionate for three small JSON files owned by the same repository and released on the same cadence.

## Consequences

- **`app/assets/*.json` is generated output.** Editing it is always wrong; the next sync overwrites it. `.gitattributes` marks it `linguist-generated`.
- The copy happens in two places that must stay equivalent. Both are plain file copies today, so they agree; anything that makes the script do more than copy has to be mirrored into [`release-app.yml`](../../.github/workflows/release-app.yml) or releases diverge from local builds.
- The aspiration is not met for every token. Palettes and suggested usernames are read from the bundle at runtime, but `shapes.json` is shipped without a single Dart reader. The app's `CellShape` is a bare hardcoded enum, and `ShapePicker` carries its own display labels. Adding a shape reaches the web and silently skips the app. Either the app grows a reader, or `shapes.json` stops being bundled and this ADR stops claiming shapes are shared.
- The mirror is asserted by [15](0015-the-maintenance-contract-is-enforced-by-a-test.md), which fails when it drifts.
