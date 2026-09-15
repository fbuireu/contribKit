# 0002: the store privacy declarations for Telemetry

Status: declared on Google Play when [ADR 0027](../adr/0027-the-app-sends-telemetry-through-two-ports-with-no-failure-channel.md) first shipped, and kept here as the record of what the form says, because it lives in a console rather than in a file and a change to what the app sends off the device has to be checked against it. The one row still to change is the *Diagnostics* purpose on *App interactions* that [ADR 0029](../adr/0029-diagnostic-reports-carry-a-masked-session-replay.md) adds: it goes in before the build carrying that change is published to any track. There is no iOS release and none planned, so there is no App Store Connect form and this page records Play alone.

[ADR 0028](../adr/0028-telemetry-consent-is-asked-twice-and-answered-asymmetrically.md) decides the consent model the declarations describe. Shipping a build that collects something the form does not name is a store policy violation, not a missing nicety.

## Google Play: Data safety

Under *App content → Data safety* (it sits inside the *Test and release* group in the current console, not under a *Policy* one), the types that now apply:

| Data type | Collected | Shared | Purpose | Optional |
| --- | --- | --- | --- | --- |
| Crash logs | Yes | No | App functionality, Diagnostics | Yes, the person can turn it off |
| App interactions | Yes | No | Analytics for the Usage Events, Diagnostics for the masked recording that rides on a crash log | Yes: Usage Events are off until turned on, and the recording follows the crash-log switch |
| Device or other IDs | Yes | No | Analytics | Yes, with the usage events it rides on |

**The *Diagnostics* purpose on the second row is [ADR 0029](../adr/0029-diagnostic-reports-carry-a-masked-session-replay.md)'s.** A Diagnostic Report from the foreground carries a short recording of the screens before the error, with every text, image and Cell drawn as a rectangle, and nothing is recorded when no error occurs. Google has no category for a masked screen recording, so it is declared as *App interactions*, the one category that describes a sequence of screens, under a second purpose beside the Usage Events' *Analytics*, with the same collection switch as the crash log it belongs to; it is not a second row and not a second consent.

**The third row is the one that is easy to get wrong, and it was.** `personProfiles = never` stops PostHog creating a *person profile*; it does not stop the SDK generating a random `distinctId` per installation and attaching it to every event, which it must do to avoid counting one installation as many. Google names the Firebase installation ID as an example of this category, and that is the same shape of thing. None of it is linked to an identity, and none of it is an advertising identifier, so "Linked to identity" and "Used for tracking" are both No.

"Shared" is No for all three: a processor acting on our instructions is not sharing in Play's sense.

Say **data is encrypted in transit** (both SDKs are HTTPS-only) and that **the person can request deletion**, which for Sentry and PostHog means mailing `contact@contribkit.app`, the same route the policy already names for RevenueCat.
