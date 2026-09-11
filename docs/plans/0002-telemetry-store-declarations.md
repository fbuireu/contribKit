# 0002: the store privacy declarations for Telemetry

Deferred, because it cannot be done from this repository. It is recorded because shipping the build without it is a store policy violation, not a missing nicety.

[ADR 0027](../adr/0027-the-app-sends-telemetry-through-two-ports-with-no-failure-channel.md) puts two vendor SDKs in the app and [ADR 0028](../adr/0028-telemetry-consent-is-asked-twice-and-answered-asymmetrically.md) decides the consent model. Both stores require the collection to be declared before the build that contains it is released, and both declarations live in a console rather than in a file here.

## Google Play: Data safety

Under *App content → Data safety* (it sits inside the *Test and release* group in the current console, not under a *Policy* one), the types that now apply:

| Data type | Collected | Shared | Purpose | Optional |
| --- | --- | --- | --- | --- |
| Crash logs | Yes | No | App functionality, Diagnostics | Yes, the person can turn it off |
| App interactions | Yes | No | Analytics | Yes, and it is off until turned on |
| Device or other IDs | Yes | No | Analytics | Yes, with the usage events it rides on |

**The third row is the one that is easy to get wrong, and it was.** `personProfiles = never` stops PostHog creating a *person profile*; it does not stop the SDK generating a random `distinctId` per installation and attaching it to every event, which it must do to avoid counting one installation as many. Google names the Firebase installation ID as an example of this category, and that is the same shape of thing. None of it is linked to an identity, and none of it is an advertising identifier, so "Linked to identity" and "Used for tracking" are both No.

"Shared" is No for all three: a processor acting on our instructions is not sharing in Play's sense.

Say **data is encrypted in transit** (both SDKs are HTTPS-only) and that **the person can request deletion**, which for Sentry and PostHog means mailing `contact@contribkit.app`, the same route the policy already names for RevenueCat.

## Apple: App Privacy

Under *App Store Connect → App Privacy*, declare:

- **Diagnostics → Crash Data**, not linked to identity, not used for tracking.
- **Usage Data → Product Interaction**, not linked to identity, not used for tracking.
- **Identifiers → Device ID**, not linked to identity, not used for tracking, for the same `distinctId` the Play table's third row covers.

None of this is actionable yet: `release-app.yml` ships to Google Play only, there is no iOS release path, and an app that is not in App Store Connect has no App Privacy form.

**Answer No to "Used for Tracking" for both.** Tracking in Apple's sense means linking to third-party data for advertising or sharing with a data broker, and neither happens: no advertising identifier is read, no identity is linked, and the RevenueCat to PostHog integration that would link two vendors' identities is deliberately not enabled ([ADR 0027](../adr/0027-the-app-sends-telemetry-through-two-ports-with-no-failure-channel.md)). Answering Yes would put the app behind an App Tracking Transparency prompt it does not need.

## The privacy manifest

Both SDKs ship their own `PrivacyInfo.xcprivacy` and Xcode aggregates them. Check whether the app target needs one of its own for required-reason APIs: `UserDefaults` is the likely one, since both SDKs and `shared_preferences` reach it. If it does, the reason code is `CA92.1` (access limited to the app itself).

## When

Before the first `release-app.yml` run that carries a `SENTRY_DSN` or a `POSTHOG_PROJECT_TOKEN`. Until those secrets exist the shipped app collects nothing, so a release built without them is honestly described by the current declarations.
