# 0002: the store privacy declarations for Telemetry

Deferred, because it cannot be done from this repository. It is recorded because shipping the build without it is a store policy violation, not a missing nicety.

[ADR 0027](../adr/0027-the-app-sends-telemetry-through-two-ports-with-no-failure-channel.md) puts two vendor SDKs in the app and [ADR 0028](../adr/0028-telemetry-consent-is-asked-twice-and-answered-asymmetrically.md) decides the consent model. Both stores require the collection to be declared before the build that contains it is released, and both declarations live in a console rather than in a file here.

## Google Play: Data safety

Under *Policy → App content → Data safety*, the two types that now apply:

| Data type | Collected | Shared | Purpose | Optional |
| --- | --- | --- | --- | --- |
| Crash logs | Yes | No | App functionality, Diagnostics | Yes, the person can turn it off |
| App interactions | Yes | No | Analytics | Yes, and it is off until turned on |

Nothing else changes. No identifier is collected: `personProfiles` is `never`, Sentry's `sendDefaultPii` is off, and a Usage Event carries only its name. "Shared" is No for both: a processor acting on our instructions is not sharing in Play's sense.

Say **data is encrypted in transit** (both SDKs are HTTPS-only) and that **the person can request deletion**, which for Sentry and PostHog means mailing `contact@contribkit.app`, the same route the policy already names for RevenueCat.

## Apple: App Privacy

Under *App Store Connect → App Privacy*, declare:

- **Diagnostics → Crash Data**, not linked to identity, not used for tracking.
- **Usage Data → Product Interaction**, not linked to identity, not used for tracking.

**Answer No to "Used for Tracking" for both.** Tracking in Apple's sense means linking to third-party data for advertising or sharing with a data broker, and neither happens: no advertising identifier is read, no identity is linked, and the RevenueCat to PostHog integration that would link two vendors' identities is deliberately not enabled ([ADR 0027](../adr/0027-the-app-sends-telemetry-through-two-ports-with-no-failure-channel.md)). Answering Yes would put the app behind an App Tracking Transparency prompt it does not need.

## The privacy manifest

Both SDKs ship their own `PrivacyInfo.xcprivacy` and Xcode aggregates them. Check whether the app target needs one of its own for required-reason APIs: `UserDefaults` is the likely one, since both SDKs and `shared_preferences` reach it. If it does, the reason code is `CA92.1` (access limited to the app itself).

## When

Before the first `release-app.yml` run that carries a `SENTRY_DSN` or a `POSTHOG_PROJECT_TOKEN`. Until those secrets exist the shipped app collects nothing, so a release built without them is honestly described by the current declarations.
