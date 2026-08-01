# 9. Tips unlock nothing

Date: 2026-07-26

## Status

Accepted.

## Context

The app has in-app purchases, which normally means something is gated. Here nothing is: every feature works without paying, and the purchases exist only so someone who wants to support the project can.

That creates a naming and UI trap. Store tooling, SDK vocabulary and prebuilt paywall screens all assume a purchase grants an entitlement. Adopting any of it would quietly tell the user they are buying something.

## Decision

Purchases are one-off tips. Buying one grants no entitlement, removes no limit, and changes nothing about how the app behaves — no code path anywhere checks whether a tip has been given.

Purchases go through RevenueCat because it normalises the two stores' billing behind one interface and keeps product definitions and prices out of the build. Its prebuilt paywall UI is deliberately not used: a paywall implies something is being unlocked. `TipJarSheet` is built from the app's own components instead.

## Consequences

- **Nothing may start depending on purchase state.** The moment something does, this ADR is false and the product has a different shape.
- The dependency carries real lock-in for what is currently a cosmetic use of it. Nothing else in the app depends on purchase state, so the surface to unwind is limited to the tip jar itself.
- The glossary reserves **Tip** for this and only this; "purchase", "donation" and "IAP" are listed under `_Avoid_` because each implies something a tip is not.
