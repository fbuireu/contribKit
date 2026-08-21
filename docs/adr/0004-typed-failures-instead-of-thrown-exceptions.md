# 4. Failures are a sealed set, matched without a wildcard

Date: 2026-07-26

## Status

Accepted.

## Context

Both clients talk to a page that is scraped, not an API that is contracted. Failure is ordinary here: the user does not exist, GitHub rate-limits, the markup changed, the network died. Handling those as free-form errors means the compiler cannot tell you when a new one appears, and the first sign of an unhandled case is a user seeing the wrong message.

## Decision

Failures are a closed, typed set that the boundary must handle exhaustively — a discriminated union on the web, a sealed hierarchy in the app. Adding a kind is a compile error at every place that matches on it, which is the point.

The two clients differ in how a failure travels, and this is deliberate rather than accidental drift. The web returns it as a value: a function that can fail is typed `T | Failure` and never throws, so the failure path is visible in the signature. The app throws its `Failure`s across `infrastructure` → `ui`, where the notifier catches them into state without inspecting them and the exhaustive match happens in the widget that renders the error.

Value objects follow the same split. On the web, `parseUsername` and `parseYear` return `T | Failure`, so an existing `Username` is always valid and nothing downstream re-validates. In the app, `Username` and `Year` validate in their constructors and throw `ArgumentError` / `RangeError` — framework errors, not `Failure`s — which the UI catches at the input boundary.

## Consequences

- **No wildcard arm.** A `_ =>` in the app's match compiles fine and silently disables Dart's exhaustiveness check; it is how four failure kinds once collapsed into one generic string. The one match is `FailureMessage.of`, and it lists every subclass on purpose. Do not widen it to silence the compiler. It used to sit in a private method on a private widget, which is why this ADR named `_ErrorState` for a year after the match had moved out of it.
- A typed failure is only worth having if something constructs it. `RateLimitedFailure` sat in the app's hierarchy with a message wired up in the UI and no code path that could produce it, because every non-200 became a `NetworkFailure`. **That is closed** — the app throws it on an upstream 429 with `resetAt` parsed from `Retry-After`.
- The web had the mirror of that gap for longer: no `RateLimited` at all, so GitHub's 429 arrived as `Network`, mapped to 502, and told the reader "could not reach github" about a service that had answered and said *slow down*. The web set is now `NotFound`, `InvalidInput`, `Network`, `Parse`, `RateLimited`, and `RateLimited` carries `retryAfterSeconds`. Nothing renders that number yet; the kind and the 429 status are what a caller needs to back off, and a field with no reader is the smaller of the two debts.
- The taxonomies do not match one-for-one, and mostly should not: the app exports files, reads bundled assets and takes Tips, so it carries `Export`, `Asset`, `Tip` and `Cache` failures the web has no use for.
- **A kind that means two things is the same defect as a kind nothing constructs.** `ParseFailure` covered both "GitHub's markup changed" and "our own bundled `palettes.json` is unreadable", and the exhaustive match renders it as the first — so a corrupt design-token file told the user to update the app because GitHub had changed. `AssetFailure` splits it. Adding a kind is cheap and the compiler finds every site; sharing one between two unrelated causes is what costs. What did have to be reconciled was `Parse` — the app lacked it and reported unparseable markup as `NotFound`, telling a user their account did not exist when GitHub had changed its page.
- The value-versus-exception split is the loose end. The app's invalid-input path sits outside the `Failure` type entirely, so the one thing the sealed hierarchy cannot tell you is whether input validation was handled.
