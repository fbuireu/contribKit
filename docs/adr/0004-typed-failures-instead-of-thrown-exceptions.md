# 4. Failures are a sealed set, matched without a wildcard

Date: 2026-07-26

## Status

Accepted. Amended 2026-10-02: the web's JSON API names a failure's kind, so the kinds are part of its published
contract. Amended 2026-10-05: an answer GitHub refused has a kind of its own in both sets. The *Decision* section
carries both amendments.

## Context

Both clients talk to a page that is scraped, not an API that is contracted. Failure is ordinary here: the user does not exist, GitHub rate-limits, the markup changed, the network died. Handling those as free-form errors means the compiler cannot tell you when a new one appears, and the first sign of an unhandled case is a user seeing the wrong message.

## Decision

Failures are a closed, typed set that the boundary must handle exhaustively: a discriminated union on the web, a sealed hierarchy in the app. Adding a kind is a compile error at every place that matches on it, which is the point.

The two clients differ in how a failure travels, and this is deliberate rather than accidental drift. The web returns it as a value: a function that can fail is typed `T | Failure` and never throws, so the failure path is visible in the signature. The app throws its `Failure`s across `infrastructure` → `ui`, where the notifier catches them into state without inspecting them and the exhaustive match happens in the widget that renders the error.

Value objects follow the same split. On the web, `parseUsername` and `parseYear` return `T | Failure`, so an existing `Username` is always valid and nothing downstream re-validates. In the app, `Username` and `Year` validate in their constructors and throw `ArgumentError` / `RangeError` (framework errors, not `Failure`s), which the UI catches at the input boundary.

*Amended 2026-10-02.* The web publishes the kind. Every `Failure` `/api/contributions` answers with becomes a JSON body built by `errorBodyFor` in [`failure-http.ts`](../../web/src/application/http/failure-http.ts): the `error` text it always carried, the variant's name as `kind`, and the `field` of an `InvalidInput`. A client words the failure from the kind, because the status conflates causes: a `Parse` failure answers 502 like a `Network` one, and a rejected Year answers 400 like a rejected Username. The landing page's `contributionError` keeps one sentence per kind in a `Record<Failure["kind"], string>`, so a new kind is a compile error there too. A separate vocabulary of public error codes was the alternative, and it would be one more table kept in step with the union for no reader who needs the two to differ. The cost is that the kind names are a published contract: renaming or splitting a variant breaks a client of the API and waits for a release that says so, while adding one is additive. The SVG route keeps its `text/plain` body, because an `<img>` reads none of it.

*Amended 2026-10-05.* An answer GitHub refused has a kind of its own. Any status besides 200, 404 and 429 (a 403, a 500, a 503) used to become `Network` on the web and `NetworkFailure('HTTP <code>')` in the app, so a request GitHub had answered told the reader the server could not be reached: the defect `RateLimited` closed for a 429, left open for the rest. `Upstream` on the web and `UpstreamFailure` in the app carry it. `Network` keeps the one thing it names, a request that got no answer, the 20 second timeout included, and its `status` field, which nothing read, is gone. The web answers an `Upstream` 502 with the status in its `error`, and `contributionError` words it apart (*github could not serve the calendar*). The kind names are published, so this adds one and renames none. In the app `FailureMessage.of` gives it a sentence of its own, `DiagnosticReportService.warrants` counts it as the world's doing like `Network`, so an outage at GitHub files no Diagnostic Report, and `CalendarFailureKind.of` maps it to `network`, so the reasons the analytics record do not change. The alternative was one kind with a wider message, which the exhaustive match could never tell apart.

## Consequences

- **No wildcard arm.** A `_ =>` in the app's match compiles fine and silently disables Dart's exhaustiveness check; it is how four failure kinds once collapsed into one generic string. There are three matches, `FailureMessage.of`, `DiagnosticReportService.warrants` and `CalendarFailureKind.of`, and each lists every subclass on purpose. Do not widen one to silence the compiler; the docs contract fails on a `switch` over a `Failure` that carries a `_` or `default` arm.
- A typed failure is only worth having if something constructs it. `RateLimitedFailure` sat in the app's hierarchy with a message wired up in the UI and no code path that could produce it, because every non-200 became a `NetworkFailure`. **That is closed**: the app throws it on an upstream 429 with `resetAt` parsed from `Retry-After`.
- The web had the mirror of that gap for longer: no `RateLimited` at all, so GitHub's 429 arrived as `Network`, mapped to 502, and told the reader "could not reach github" about a service that had answered and said *slow down*. The web set is now `NotFound`, `InvalidInput`, `Network`, `Upstream`, `Parse`, `RateLimited` and `Delivery`, and `RateLimited` carries `retryAfterSeconds`, which is read: `retryAfterHeader` turns it back into a `Retry-After` on the way out and both data routes spread it into their error response, so the wait GitHub named survives the round trip instead of being parsed and dropped. It answers `{}` for every other kind and for a 429 that named no wait, because a fabricated `Retry-After` is worse than none.
- The taxonomies do not match one-for-one, and mostly should not: the app exports files, reads bundled assets and takes Tips, so it carries `Export`, `Asset`, `Tip` and `Cache` failures the web has no use for.
- **A kind that means two things is the same defect as a kind nothing constructs.** `ParseFailure` covered both "GitHub's markup changed" and "our own bundled `palettes.json` is unreadable", and the exhaustive match renders it as the first. So a corrupt design-token file told the user to update the app because GitHub had changed. `AssetFailure` splits it. Adding a kind is cheap and the compiler finds every site; sharing one between two unrelated causes is what costs. What did have to be reconciled was `Parse`: the app lacked it and reported unparseable markup as `NotFound`, telling a user their account did not exist when GitHub had changed its page.
- The value-versus-exception split is the loose end. The app's invalid-input path sits outside the `Failure` type entirely, so the one thing the sealed hierarchy cannot tell you is whether input validation was handled.
