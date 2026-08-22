# 15. The maintenance contract is enforced by a test

Date: 2026-07-26

## Status

Accepted.

## Context

This repo carries a lot of prose: a root `CLAUDE.md`, a glossary in `CONTEXT.md`, an `ARCHITECTURE.md`, thirteen per-layer `CLAUDE.md` files, this ADR directory, a published wiki and four READMEs. They are the primary interface for anyone (increasingly, an agent) arriving without context, and the maintenance contract already states the rule: when you change code, update the docs in the same commit.

Nothing checked. Documentation rot is silent by construction: no build fails, no type breaks, and the only signal is a reader acting on a claim that stopped being true. Writing these documents produced exactly that, repeatedly and undetected by review:

- An ADR claimed failures were matched exhaustively in both clients. A `_ =>` arm in the app disabled the check entirely.
- An ADR claimed cell shapes were shared from `shared/shapes.json`. No Dart code reads it.
- The glossary and four other documents stated GitHub launched in 2005. It was 2008.
- The wiki documented `flutter run --flavor development`. The app has no build flavors; the command fails.

A document that reads plausibly is indistinguishable from a document that is correct.

## Decision

`docs/docs-consistency.test.ts` reads the documents as data and asserts every mechanically checkable claim against the repository: that relative markdown links resolve, that ADRs are numbered sequentially and carry one title each, that `shared/*.json` matches the mirrored copies in `app/assets/`, that every palette and shape shipped is advertised in the README, that no stray `CONTEXT.md` survives outside the root, and that every source path cited in any document exists.

It runs with `pnpm test` and alone with `pnpm test:docs`. It used to need an entry point in each of two path-filtered CI workflows, and getting that wrong disabled it silently three times. `ci.yml` carries no path filter now and runs it in a `Docs Contract` job that is not gated on which client changed, which is the only arrangement where the question does not have to be asked. That matters because a large share of the assertions are about the Flutter side: the mirrored tokens in `app/assets/`, the nested guides under `app/lib/`, the ban on `//` comments in hand-written Dart, the glossary `_Avoid_` terms as identifiers. The file itself sits in `docs/`, beside the documents it polices rather than inside either client: vitest reaches it through an `../docs/**/*.test.ts` entry in `web/vitest.config.ts`, `tsc` through an `include` entry and a `vitest` path mapping in `web/tsconfig.json`, and biome because the lint and format scripts pass `../docs` alongside `.`. All four are load-bearing: drop any one and the contract stops being checked by that tool.

Generating the documents from the code was rejected. What makes them worth reading is the part no generator can produce: why a decision was made, which trap it avoids, what not to do.

## Consequences

- **Keeping the `Docs Contract` job ungated is load-bearing.** Gate it on which client changed, or reintroduce a path filter on `ci.yml`, and the contract stops running for exactly the changes most likely to break it. It does so silently, which is the same failure mode the test exists to prevent. This was got wrong three times while the CI was split in two.
- The job installs Node and the web dependencies to run a test that touches no Dart, on app-only pull requests too. That cost is deliberate and is the price of the guard being unconditional.
- Each rule was verified by breaking it and confirming the matching case fails. That exercise found a bug in the test itself: it compared token files byte-for-byte and failed on CRLF versus LF in a Windows checkout.
- It verifies references, not reasoning. Prose, rationale and "is this explanation still honest" are outside its reach: the documents can be entirely green and thoroughly misleading.
- A false positive blocks a pull request. The intended fix is the assertion or the doc, never deleting the check to get green.
