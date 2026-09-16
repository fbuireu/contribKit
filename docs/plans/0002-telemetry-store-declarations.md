# 0002: the store privacy declarations for Telemetry and the Contact Message

Deferred, because it cannot be done from this repository. It is recorded because shipping the build without it is a store policy violation, not a missing nicety.

[ADR 0027](../adr/0027-the-app-sends-telemetry-through-two-ports-with-no-failure-channel.md) puts two vendor SDKs in the app and [ADR 0028](../adr/0028-telemetry-consent-is-asked-twice-and-answered-asymmetrically.md) decides the consent model. [ADR 0029](../adr/0029-contact-messages-leave-through-cloudflares-send-email-binding.md) then adds the Contact sheet, which is the first thing a person *types* that the app sends anywhere, and it needs two rows of its own. Both stores require the collection to be declared before the build that contains it is released, and both declarations live in a console rather than in a file here.

## Google Play: Data safety

Under *App content → Data safety* (it sits inside the *Test and release* group in the current console, not under a *Policy* one), the types that now apply:

| Data type | Collected | Shared | Purpose | Optional |
| --- | --- | --- | --- | --- |
| Crash logs | Yes | No | App functionality, Diagnostics | Yes, the person can turn it off |
| App interactions | Yes | No | Analytics | Yes, and it is off until turned on |
| Device or other IDs | Yes | No | Analytics | Yes, with the usage events it rides on |
| Personal info: Name, Email address | Yes | No | App functionality | Yes, only when a message is sent |
| Messages: Other in-app messages | Yes | No | App functionality | Yes, only when a message is sent |

**The third row is the one that is easy to get wrong, and it was.** `personProfiles = never` stops PostHog creating a *person profile*; it does not stop the SDK generating a random `distinctId` per installation and attaching it to every event, which it must do to avoid counting one installation as many. Google names the Firebase installation ID as an example of this category, and that is the same shape of thing. None of it is linked to an identity, and none of it is an advertising identifier, so "Linked to identity" and "Used for tracking" are both No.

**The last two rows are the Contact sheet, and they are collected only on send.** A person who never opens it sends none of it, which is what "Optional" means on this form. The purpose is *App functionality* rather than *Customer support*, because there is no support system: the message becomes an email and nothing here stores it ([ADR 0029](../adr/0029-contact-messages-leave-through-cloudflares-send-email-binding.md)). Neither is linked to identity and neither is used for tracking. **The form has to be resubmitted before the next release that carries the Contact sheet.**

"Shared" is No for all five: a processor acting on our instructions is not sharing in Play's sense. Cloudflare is the processor for the last two.

Say **data is encrypted in transit** (both SDKs are HTTPS-only) and that **the person can request deletion**, which for Sentry and PostHog means mailing `contact@contribkit.app`, the same route the policy already names for RevenueCat.

## Apple: App Privacy

Under *App Store Connect → App Privacy*, declare:

- **Diagnostics → Crash Data**, not linked to identity, not used for tracking.
- **Usage Data → Product Interaction**, not linked to identity, not used for tracking.
- **Identifiers → Device ID**, not linked to identity, not used for tracking, for the same `distinctId` the Play table's third row covers.
- **Contact Info → Name** and **Contact Info → Email Address**, and **User Content → Customer Support**, for the Contact sheet. Not linked to identity, not used for tracking.

None of this is actionable yet: `release-app.yml` ships to Google Play only, there is no iOS release path, and an app that is not in App Store Connect has no App Privacy form.

**Answer No to "Used for Tracking" for both.** Tracking in Apple's sense means linking to third-party data for advertising or sharing with a data broker, and neither happens: no advertising identifier is read, no identity is linked, and the RevenueCat to PostHog integration that would link two vendors' identities is deliberately not enabled ([ADR 0027](../adr/0027-the-app-sends-telemetry-through-two-ports-with-no-failure-channel.md)). Answering Yes would put the app behind an App Tracking Transparency prompt it does not need.

## The privacy manifest

Both SDKs ship their own `PrivacyInfo.xcprivacy` and Xcode aggregates them. Check whether the app target needs one of its own for required-reason APIs: `UserDefaults` is the likely one, since both SDKs and `shared_preferences` reach it. If it does, the reason code is `CA92.1` (access limited to the app itself).

## When

Before the first `release-app.yml` run that carries a `SENTRY_DSN` or a `POSTHOG_PROJECT_TOKEN`. Until those secrets exist the shipped app collects no Telemetry, so a release built without them is honestly described by the current declarations.

**The Contact rows are the exception and are due sooner.** They need no secret and no dart-define: the sheet works in every build, so the **first release carrying it** already collects a name, an address and a message. Resubmit the Data safety form with that release, not after it.
