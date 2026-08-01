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

- **No wildcard arm.** A `_ =>` in the app's match compiles fine and silently disables Dart's exhaustiveness check; it is how four failure kinds once collapsed into one generic string. The match in `_ErrorState` lists every subclass on purpose. Do not widen it to silence the compiler.
- A typed failure is only worth having if something constructs it. `RateLimitedFailure` sat in the hierarchy with a message wired up in the UI and no code path that could produce it, because every non-200 became a `NetworkFailure`.
- The taxonomies do not match one-for-one, and mostly should not: the app exports files and takes payments, so it carries `Export`, `Purchase` and `Cache` failures the web has no use for. What did have to be reconciled was `Parse` — the app lacked it and reported unparseable markup as `NotFound`, telling a user their account did not exist when GitHub had changed its page.
- The value-versus-exception split is the loose end. The app's invalid-input path sits outside the `Failure` type entirely, so the one thing the sealed hierarchy cannot tell you is whether input validation was handled.
