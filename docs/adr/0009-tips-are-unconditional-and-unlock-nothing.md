# 9. Tips unlock nothing

Date: 2026-07-26

## Status

Accepted.

## Context

The app has in-app purchases, which normally means something is gated. Here nothing is: every feature works without paying, and the purchases exist only so someone who wants to support the project can.

That creates a naming and UI trap. Store tooling, SDK vocabulary and prebuilt paywall screens all assume a purchase grants an entitlement. Adopting any of it would quietly tell the user they are buying something.

## Decision

What the stores sell here are one-off Tips. Giving one grants no entitlement, removes no limit, and changes nothing about how the app behaves: no code path anywhere checks whether a Tip has been given.

Tips go through RevenueCat because it normalises the two stores' billing behind one interface and keeps product definitions and prices out of the build. Its prebuilt paywall UI is deliberately not used: a paywall implies something is being unlocked. `TipJarSheet` is built from the app's own components instead.

## Consequences

- **Nothing may start depending on whether a Tip was given.** The moment something does, this ADR is false and the product has a different shape.
- The dependency carries real lock-in for what is currently a cosmetic use of it. Nothing else in the app reads that state, so the surface to unwind is limited to the Tip Jar itself.
- The glossary reserves **Tip** for this and only this; "purchase", "donation" and "IAP" are listed under `_Avoid_` because each implies something a Tip is not. **The code did not obey that** (`PurchaseRepository`, `PurchaseTip`, `PurchaseFailure` and a `purchase()` method) because the docs-consistency guard policed only `_Avoid_` terms shaped like identifiers, and `purchase` is a plain lowercase word. It is `TipRepository`, `GiveTip`, `TipFailure` and `give()` now, and the guard polices the word.
- **`GiveTip` returns a `TipOutcome` (`completed` / `cancelled`), and that is not an entitlement.** It is the transient answer to "did the store sheet finish", read only by the Tip Jar to decide whether to say thank you, and it is never persisted or consulted again. The distinction matters because `Future<void>`, what it returned first, made a cancelled Tip indistinguishable from a completed one. A return value that outlived the sheet, or that any other module read, would break this decision; this one does neither.
