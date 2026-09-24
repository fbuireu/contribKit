# 28. Telemetry Consent is asked twice and answered asymmetrically

Date: 2026-09-11

## Status

Accepted. Carries the consent half of [27](0027-the-app-sends-telemetry-through-two-ports-with-no-failure-channel.md). **Amended by [30](0030-contact-messages-leave-through-cloudflares-send-email-binding.md)**, which adds to the Data safety table below: the app also collects a name, an email address and a message now, none of which is Telemetry and none of which this decision's consent model governs. Amended 2026-09-24: a Usage Event names the Tip Product and the outcome when a Tip is given, cancelled or fails, so the table declares purchase history too, under the same opt-in as every other Usage Event.

## Context

Until now the app's privacy position was simple and true: the published policy said it "bundles no analytics or crash-reporting SDKs". [27](0027-the-app-sends-telemetry-through-two-ports-with-no-failure-channel.md) makes that sentence false, so the policy has to change and the question of consent has to be answered rather than assumed.

Under GDPR the two halves are not the same question. Diagnostic Reports are the narrow case usually defended as legitimate interest: they carry no identifier, they exist to fix defects in the thing the person is using, and a person who has hit a crash is generally better served by it being reported. Usage Events are product analytics, which in the EU is the case where regulators have been least willing to accept legitimate interest and where the safe answer is prior consent.

Treating them the same means choosing between two bad options: gate both behind an opt-in and lose most crash reports, which are the ones that fix the app for everybody, or default both on and ship EU product analytics without consent.

The alternatives were:

- **One switch, default on.** Simplest, and the option that ships analytics without consent.
- **One switch, default off.** Defensible, and it means the crash reports that matter most, the ones from people who never open a settings sheet, never arrive.
- **A blocking first-run consent dialog.** What the web banner does. On a phone it is a wall between a person and an app they just installed, for a product whose entire first-run experience is "type a username", and it would be the only modal in the app.
- **Two switches, defaulted differently, reachable at any time.**

## Decision

`TelemetryConsent` holds two `ConsentChoice` values, each `unasked`, `granted` or `denied`, and the two are read asymmetrically:

- `mayReportDiagnostics` is `diagnosticReports != denied`. Unasked means yes. Diagnostic Reports are **opt-out**.
- `mayRecordUsageEvents` is `usageEvents == granted`. Unasked means no. Usage Events are **opt-in**.

The asymmetry is the decision, and it is expressed as two different comparisons on purpose rather than as two booleans with different defaults, so that "nobody has answered yet" stays distinguishable from "somebody said yes". `isAnswered` exists for that distinction and is what a future first-run prompt would read.

There is **no blocking prompt**. The Privacy sheet is reachable from the Viewer header, beside the Tip Jar, and it states in one sentence what never leaves the device. It is not part of the Customizer: [`CONTEXT.md`](../../CONTEXT.md) defines the Customizer as Palette, Cell Shape, Cell Size and Background, and privacy is not an appearance setting.

Both choices are persisted through `SettingsRepository` under `telemetryDiagnosticReports` and `telemetryUsageEvents`, as the enum's `name`. Withdrawing consent is not merely a flag: `applyConsent(granted: false)` shuts Sentry down and opts PostHog out, and Sentry's `beforeSend` returns null once stopped, so an event already queued natively is dropped rather than sent.

Both vendors are configured to ingest in the **European Union**: PostHog's host defaults to `https://eu.i.posthog.com` and the Sentry DSN is expected to be an EU-region one. The policy says the data is processed in the EU, so the default must be the EU rather than a setting somebody has to remember.

## Consequences

- **The published privacy policy is now load-bearing in a way it was not.** It names two processors, says what each receives, and says the data is processed in the EU. Every one of those is a claim a configuration change can falsify. Changing the PostHog host, or issuing a Sentry DSN in another region, is a policy change and not a config change.
- **The store has to be told, and what it was told is recorded here.** Google Play's *Data safety* form has to declare what the app collects, and it is a declaration the store holds us to. This is the part of this decision that is genuinely hard to reverse: an app that has declared a data type and stops collecting it has to re-declare, and the declaration is visible to anybody on the store listing. There is no iOS release and none planned, so there is no App Store Connect form. The form lives in a console rather than in a file, so this is the copy a change to what the app sends off the device is checked against. Under *App content → Data safety* (inside the *Test and release* group in the current console):

  | Data type | Collected | Shared | Purpose | Optional |
  | --- | --- | --- | --- | --- |
  | Crash logs | Yes | No | App functionality, Diagnostics | Yes, the person can turn it off |
  | App interactions | Yes | No | Analytics for the Usage Events, Diagnostics for the masked recording that rides on a crash log ([29](0029-diagnostic-reports-carry-a-masked-session-replay.md)) | Yes: Usage Events are off until turned on, and the recording follows the crash-log switch |
  | Device or other IDs | Yes | No | Analytics | Yes, with the Usage Events it rides on |
  | Personal info: Name, Email address | Yes | No | App functionality | Yes, and only when a Contact Message is sent |
  | Messages: Other in-app messages | Yes | No | App functionality | Yes, and only when a Contact Message is sent |
  | Financial info: Purchase history | Yes | No | Analytics | Yes, with the Usage Events it rides on: only `tipGiven`, `tipCancelled` and `tipFailed` carry it, naming the Tip Product and the outcome and never a price paid or a payment detail |

  The third row is the one that is easy to get wrong, and it was: `personProfiles = never` stops PostHog creating a *person profile*; it does not stop the SDK generating a random `distinctId` per installation and attaching it to every event, which it must do to avoid counting one installation as many. Google names the Firebase installation ID as an example of this category, and that is the same shape of thing. None of it is linked to an identity and none of it is an advertising identifier, so *Linked to identity* and *Used for tracking* are No throughout. *Shared* is No on every row: a processor acting on our instructions is not sharing in Play's sense, and that covers Cloudflare for the last two as well as Sentry and PostHog for the first three. The form also says data is encrypted in transit (both SDKs are HTTPS-only) and that the person can request deletion, which for Sentry and PostHog means mailing `contact@contribkit.app`, the same route the policy names for RevenueCat. The last two rows arrived with [30](0030-contact-messages-leave-through-cloudflares-send-email-binding.md) and are the only ones this decision's consent model does not govern: a Contact Message is sent because a person pressed Send, so there is no switch and nothing to turn off. Their purpose is *App functionality* rather than *Customer support*, because there is no support system behind them: the message becomes an email and nothing stores it. They need no secret and no dart-define either, so unlike the Telemetry rows they are live in **every** build, and the form has to be resubmitted with the first release that carries the Contact sheet rather than after it. The masked recording is a second purpose on the existing *App interactions* row, not a row of its own and not a second consent; Google has no category for a masked screen recording, and *App interactions* is the one that describes a sequence of screens.
- **Opt-out for Diagnostic Reports is a position, not a neutral default.** It is defensible because a Diagnostic Report carries no identifier and no message ([27](0027-the-app-sends-telemetry-through-two-ports-with-no-failure-channel.md) is what makes that true). If that ever stops being true, this default stops being defensible and has to move to opt-in with it. The two decisions are joined.
- **The opt-in only holds because the platform is told not to start PostHog itself.** `posthog_flutter` reads
  `com.posthog.posthog.PROJECT_TOKEN` from `AndroidManifest.xml` and from `Info.plist` and initialises from
  `onAttachedToEngine`, which runs before any Dart. Its `AUTO_INIT` defaults to **true**, so the vendor's own
  install instructions, followed literally, would start capturing before the consent gate exists, with application
  lifecycle events on and debug logging in a release build. Both files declare `AUTO_INIT` false, and
  `no_platform_auto_init_test.dart` asserts that plus the absence of every key those instructions tell you to
  paste. Without it the guarantee rests on nobody following the documentation.
- **`unasked` is a third state that most code must not care about.** Only `isAnswered` reads it. Anything else asking "has this person consented" must go through `mayReportDiagnostics` or `mayRecordUsageEvents`, never compare to `granted` directly, or the asymmetry silently becomes symmetric.
- **The consent choice is read twice from storage, in two isolates.** `main.dart` reads it before `runApp` to decide whether to start Sentry early, and the WorkManager isolate reads it again through `HiveSettingsRepository` before reporting anything from a background refresh. Both go through the repository rather than touching Hive, which is the trap the root guide names first.
- **A first-run prompt is deliberately not shipped and stays possible.** `isAnswered` is the only thing it would need. If Usage Events turn out to be too sparse to be useful, that is the change to make, not flipping the default.
- Where this bites: the app section of [`web/src/pages/privacy.astro`](../../web/src/pages/privacy.astro), [`app/lib/ui/AGENTS.md`](../../app/lib/ui/AGENTS.md), and the *What the app sends off the device* row of the root [`AGENTS.md`](../../AGENTS.md), which points back at the table above.
