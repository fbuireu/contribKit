# 27. The app sends Telemetry through two ports with no failure channel

Date: 2026-09-11

## Status

Accepted. Sits beside [4](0004-typed-failures-instead-of-thrown-exceptions.md), whose rule it deliberately departs from, and [25](0025-how-much-ddd-and-where-it-stops.md), whose three questions decided what got modelled.

## Context

The app had no Telemetry of any kind. A defect reached us only if somebody wrote an email, and nothing said which surfaces people actually used. Adding a crash reporter and a product-analytics SDK is the obvious answer, and both SDKs want the same thing: initialise early, capture everything, attach as much context as you can get.

That default is wrong here for a specific reason. The one piece of data this app handles is a **Username**, which is a GitHub handle and therefore personal data, and it is present in almost everything that could be attached to a report. `NotFoundFailure.toString()` is `'NotFoundFailure: user "octocat" not found'`. `NetworkFailure` carries the stringified http error, which contains the request URL, which contains the Username. `CacheFailure` carries the stringified Hive error, which contains a filesystem path. An SDK that captures unhandled errors and sends their messages exfiltrates the Username by default, through code nobody wrote.

The second force is that [9](0009-tips-are-unconditional-and-unlock-nothing.md) forbids the app from checking purchase state. RevenueCat ships a PostHog integration that would have given revenue figures beside usage for no code; it works by sharing a user identity between the two SDKs and writing an `rc_subscription_status` user attribute on every event. That is the state [ADR 0009](0009-tips-are-unconditional-and-unlock-nothing.md) exists to keep out of this codebase, arriving through configuration rather than through code.

The alternatives considered for the ports themselves:

- **One `TelemetryRepository` with both concerns.** Fewer files. It also means one consent switch for two things a person has separate opinions about, and one SDK's failure to initialise taking the other with it.
- **No port at all, call the SDKs from `ui/`.** Cheapest, and it puts two vendor SDKs in the layer that is meant to know only Flutter and Riverpod, with no seam any test can stand in front of.
- **Two ports in `domain/repositories/`.**

## Decision

Two ports, `DiagnosticsRepository` and `UsageEventRepository`, each with `start`, one verb, and `applyConsent`. They are separate because their consent is separate, their vendors are separate, and one being unconfigured must not silence the other.

**Neither port has a `Failure` channel, and that is the departure from [4](0004-typed-failures-instead-of-thrown-exceptions.md).** Every other repository in `infrastructure/` converts what it catches into a typed `Failure` and lets it travel. These two catch everything and return. Telemetry that breaks the app is worse than no telemetry, and there is no caller who could act on a `TelemetryFailure`: the UI cannot tell a person that a crash report failed to send, and doing so would be absurd. `FailureMessage.of` therefore gains no kind and remains the only exhaustive match.

**A Usage Event carries its name and nothing else.** `UsageEvent` is a sealed enum in `domain/value_objects/`, and `record` takes one, not a string with a properties map. There is no parameter through which a Username could be passed, so no reviewer has to check that none was. Applying the three questions of [25](0025-how-much-ddd-and-where-it-stops.md): the illegal state is reachable (any string would have been accepted), something reads it (the adapter, and PostHog's dashboard), and it crosses a boundary (off the device). It earns a type.

**A Diagnostic Report carries the error's type and its stack, never its message.** The Sentry adapter's `beforeSend` rewrites the `value` of every `SentryException` to a constant and blanks `message` when there is one, so the rule holds for reports this code raises *and* for the unhandled errors `SentryFlutter.init` captures on its own, which is the path nobody writes and everybody forgets. Breadcrumbs are off at source (`maxBreadcrumbs = 0`) rather than scrubbed, because Sentry's `copyWith` is `x ?? this.x` and cannot clear a field by passing null.

**The RevenueCat integration is not enabled**, and must not be. It is rejected on [9](0009-tips-are-unconditional-and-unlock-nothing.md) grounds, not on effort grounds.

Both SDKs are inert without a credential: `TelemetryConfig.fromEnvironment` reads `SENTRY_DSN` and `POSTHOG_PROJECT_TOKEN` from `--dart-define`, and `start` returns immediately when either is empty. A local build therefore sends nothing, which is also what makes the whole thing testable without a network.

## Consequences

- **`dart-defines.json` and `dart-defines.prod.json` now differ by two keys, not one.** [22](0022-the-app-has-no-build-flavors-and-the-stage-is-a-dart-defines-file.md) recorded that the difference was one string and said to reopen the decision when a second value had to vary per stage. `TELEMETRY_ENVIRONMENT` is that second value. It does not reopen it: the rule that mattered was "no Gradle flavor while the difference is expressible in Dart", and this is still expressible in Dart. That ADR's Context is now describing a past state and says so. **In CI it is not a repository variable**: `release-app.yml` derives it from the `track` input, the same input that already selects the GitHub Environment, so the two cannot disagree. An absent value falls back to `development`, because mislabelling test traffic as production is the harder mistake to undo.
- **The credentials are not in the repository.** `SENTRY_DSN` and `POSTHOG_PROJECT_TOKEN` are secrets on the app environments and are written into `dart-defines.json` by `release-app.yml` at build time, the way `REVENUECAT_KEY` already was. A hand-run `flutter build` produces an app with no Telemetry, silently. That is the safe direction, and it means "why is nothing arriving in Sentry" has a boring first answer.
- **Two vendor SDKs now ship in the binary**, with their native halves. That is app size, more things that can break a build, and more privacy manifests riding along. Neither is exempt from the glossary guard, because neither speaks a word the glossary rejects: the `SDK_SEAMS` list is unchanged and still names only RevenueCat's files, so the cap the contract asserts on it does not have to move.
- **Nothing may start reading a Usage Event back.** They leave the device and do not return. Code that branches on whether an event was recorded is the same mistake as code that branches on whether a Tip was given.
- **`start()` takes no app runner, and must not grow one.** Sentry's `init` accepts an `appRunner` that runs the
  app inside its own guarded zone, and every example passes one. It is not needed here: `FlutterErrorIntegration`
  and `OnErrorIntegration` are installed regardless, and since Flutter 3.3 `PlatformDispatcher.onError` catches the
  uncaught async errors the zone used to be for. Taking an `appRunner` would mean the domain port owning the call
  that runs the application, which is a large thing to hand a telemetry interface for a capture path that is
  already covered.
- **`main.dart` starts Sentry before `runApp`, and that is not covered by the coverage floor.** The bootstrap exclusion the root guide describes now covers one more thing. What is covered is every piece it assembles: `TelemetryConfig`, both adapters and `TelemetryConsent` each have their own tests, and the adapters take their SDK entry points as constructor parameters precisely so they can be driven without a device.
- Where this bites: [`app/lib/infrastructure/CLAUDE.md`](../../app/lib/infrastructure/CLAUDE.md), [`app/lib/domain/CLAUDE.md`](../../app/lib/domain/CLAUDE.md), [`app/lib/ui/di/CLAUDE.md`](../../app/lib/ui/di/CLAUDE.md), and the consent half in [28](0028-telemetry-consent-is-asked-twice-and-answered-asymmetrically.md).
