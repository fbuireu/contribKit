# 31. The web keeps its hand-written Failure union instead of Effect

Date: 2026-09-16

## Status

Accepted. Holds the web half of [4](0004-typed-failures-instead-of-thrown-exceptions.md) against the obvious alternative, and records what would overturn it.

## Context

[4](0004-typed-failures-instead-of-thrown-exceptions.md) decided that a failure is a closed typed set matched exhaustively at the boundary, and that the web carries it as a returned value. It never said why the web writes that union by hand when [Effect](https://effect.website) exists and does the same job with a real error channel, typed dependencies, retries and interruption.

The question came up directly, so here is the measurement it deserves. Every figure below is counted over the tree at the time of writing, excluding tests.

What Effect would take away:

| | Count |
| --- | --- |
| `isFailure` guards | 12, spread as 6 in `pages/`, 3 in `application/`, 1 each in `domain/`, `infrastructure/` and `ui/` |
| Functions typed `T \| Failure` | 7 |
| Longest run of guards in one function | 4, in [`pages/api/contributions.ts`](../../web/src/pages/api/contributions.ts) |
| Longest run of `await`s in one function | 3, in [`pages/api/contact.ts`](../../web/src/pages/api/contact.ts) |
| Files that bind a dependency by hand | 2, [`_contributions.ts`](../../web/src/pages/_contributions.ts) and [`_contact.ts`](../../web/src/pages/_contact.ts) |
| Hand-rolled retry or timeout | 1, the `AbortSignal.timeout` in the GitHub scraper |

Twelve guards and one timeout. That is the whole of the pain a calling convention would remove.

Three facts decide the rest.

Effect is a calling convention, not a utility. A tree holding `Effect<A, E, R>` in one layer and `T | Failure` in another has two error models plus a place that converts between them, which is worse than either alone. So the choice is the whole of `web/src` or none of it.

`ui/` cannot opt out. It imports `@domain/failures/failure` in five files, and [`page-init.ts`](../../web/src/ui/utils/page-init.ts) already calls `contributionDay`, which answers `ContributionDay | Failure`. An Effect-typed domain reaches every one of those callers whether or not `ui/` is described as adopting anything. `ui/` is also the largest web layer at 26 modules, and all of it ships to the browser, where ContribKit's own JavaScript currently weighs 32,404 bytes minified across every page. Its error handling is `contributionError({ status, serverMessage })`, a lookup from status to sentence, with one fallible call in it.

The app cannot follow. `app/lib` holds 101 modules against `web/src`'s 64, and Dart has no Effect. Adoption therefore tops out at 39% of the codebase, and the seam being removed inside `web/` reappears at the language boundary and stays there. [4](0004-typed-failures-instead-of-thrown-exceptions.md) already allows the two clients to differ in *mechanism* while the *concept* stays identical, so this is a cost rather than a veto. It does mean that consistency is the one thing adoption cannot buy.

## Decision

The web keeps the union in [`domain/failures/failure.ts`](../../web/src/domain/failures/failure.ts), returned as a value, guarded by `isFailure`, mapped through `STATUS_BY_KIND` typed `Record<Failure["kind"], number>` so a new kind fails to compile until it is handled. No Effect, and no partial adoption of it in any layer.

Zod stays too, for a smaller reason. The two routes that validate a query string or a body use `astro/zod`, which arrives with Astro and costs nothing. Effect Schema is the one place Effect would replace a dependency rather than add one, and replacing something already paid for is a loss.

This decision is cheap to reverse, which is the point of writing it down rather than arguing it again. Any one of these overturns it:

- guard runs past roughly five, or fallible composition spreading out of `pages/`
- a second outbound service, so retry and backoff stop being one line in one file
- a dependency graph the curried `useCase(deps)(params)` no longer carries
- a decision that `web/` and `app/` need not stay diffable, which is a larger question than an error library and should be settled on its own terms

## Consequences

- **The bundle cost was never measured, and a revisit starts by measuring it.** Effect's tree-shaken weight in this project is unknown. The number to take is the diff in `dist/client` after installing it and building, against the 32,404 bytes already there. Quoting a figure from someone else's benchmark would not have been evidence.
- **The guards stay, and they are meant to.** Twelve early returns is not a defect this decision tolerates. It is what the code costs at this size, and a reviewer who finds them tedious should count them before proposing the fix.
- **The domain's no-package rule survives intact.** [3](0003-layered-domain-architecture-in-both-clients.md) allows the domain only the language and the shared token JSON, and the docs contract asserts the import direction behind it. Effect in the domain would have needed that rule rewritten or exempted, and an exemption for one library is how the rule stops meaning anything.
- **The one real gap is retry, and it is still open.** The scraper times out at 20 seconds and does not retry. That is worth fixing on its own, in about a dozen lines in `infrastructure/`, and it is the piece of Effect's offer that this codebase would actually use today.
- **The same question will be asked again.** It should be, against the triggers above rather than from scratch, and whoever asks should recount the table rather than trusting these numbers, which describe the tree on the date at the top of this file.
