# 29. Diagnostic Reports carry a masked Session Replay

Date: 2026-09-15

## Status

Accepted. Extends [27](0027-the-app-sends-telemetry-through-two-ports-with-no-failure-channel.md), whose guarantee it keeps, and leans on [28](0028-telemetry-consent-is-asked-twice-and-answered-asymmetrically.md), whose opt-out default it must not undermine.

## Context

The first Diagnostic Report that reached Sentry from a shipped build was the shape [27](0027-the-app-sends-telemetry-through-two-ports-with-no-failure-channel.md) designed: type `NetworkFailure`, message `redacted`, a stack ending at the `throw` inside `GitHubContributionRepository._fetch`. It said *what* failed and nothing about *how the person got there*, and because the message is gone on purpose, the type and the stack are the whole of what a report can ever say. That was the trade [27](0027-the-app-sends-telemetry-through-two-ports-with-no-failure-channel.md) made, and this report was the first to show what it costs: a defect in the Viewer would arrive with nothing to reproduce it from.

Sentry's Session Replay is the SDK's answer to that: a recording of the screens before an error, uploaded with it. It is also the most personal thing the SDK can send, for the same reason [27](0027-the-app-sends-telemetry-through-two-ports-with-no-failure-channel.md) exists: everything on this app's screen is a Username, or the Contribution Data it fetched for one. A recording that shows either is the message leak again, in pictures.

The alternatives:

- **No replay.** The status quo. Reports keep naming a type and a line, and the first one to describe a real defect will be as thin as the one that prompted this.
- **Record every session** (`sessionSampleRate` above zero). Recordings of people who hit no error, which is data about nothing the app needs to fix, and a policy that would have to say "we record your screen".
- **`attachScreenshot`.** One frame at the moment of the error, under the same masking rules. It carries the same privacy questions as a replay and answers fewer of the defect's.
- **Record only around an error, masked.** The SDK keeps a short rolling buffer and uploads it only when an error is captured, with every text and image drawn as a rectangle.

The masking defaults are not enough on their own. `maskAllText` covers `Text`, `EditableText` and `RichText`; `maskAllImages` covers `Image`. The contribution grid is none of those: `ContributionCell` paints its Cells with `CustomPaint` and `DecoratedBox`, so a replay under the defaults would show the whole year's pattern in colour, which is the Contribution Data the glossary says a Diagnostic Report never carries.

## Decision

A Diagnostic Report raised in the foreground carries a masked replay of the moments before it, and nothing records a session in which no error occurred.

`SentryDiagnosticsRepository._configure` sets `sessionSampleRate` to zero and `onErrorSampleRate` to one, sets `maskAllText` and `maskAllImages`, picks the lowest replay quality, and adds one masking rule of its own: any widget whose runtime type is in the adapter's `maskedWidgets` is masked whole, children included. **The adapter does not know which types those are.** It is in `infrastructure/`, and the widgets are in `ui/`, which it may not import. The two composition roots, `providers.dart` and `main.dart`, pass `contributionDataWidgets` from [`contribution_data_widgets.dart`](../../app/lib/ui/contribution_data_widgets.dart), a set holding `ContributionGrid`. The rule compares `Type` values, never type names: the release build is obfuscated, so a name comparison would match nothing in production while passing every test, which is the failure mode Sentry's own debug-mode warning describes.

A type rule was chosen over wrapping each grid in `SentryMask`. The grid is built in three places (the Viewer, the Export sheet's preview and the Customizer's preview) and a wrapper at each is a promise kept by remembering, which is the mechanism the deleted `ExportPanel` in the `ui/` guide already showed failing here. One `Set<Type>` is a rule.

`SentryWidget` wraps the app in `main.dart`, because the SDK captures only the tree beneath it; without it replay is configured and records nothing. The wrapper is inert when Sentry has not started, so it is applied whether or not consent was granted. `attachScreenshot` stays off: the replay supersedes it.

The background isolate is untouched by any of this. It has no widgets to record, and the same change taught it to stop reporting the failures the world causes: `DiagnosticReportService.warrants` says which `Failure` kinds mean a defect, and `callbackDispatcher` reports only those. That is a rule in a guide rather than a decision here, because it is a line of code to reverse.

## Consequences

- **The guarantee of [27](0027-the-app-sends-telemetry-through-two-ports-with-no-failure-channel.md) now rests on masking as well as on `beforeSend`.** A widget that shows a Username or Contribution Data and is neither a `Text`, an `Image` nor in `contributionDataWidgets` is visible in a replay, and nothing mechanical guards that set. It is one widget today because the grid is one widget; a second renderer of Cells has to be added to the set in the same commit, and the `ui/` guide says so.
- **The opt-out default of [28](0028-telemetry-consent-is-asked-twice-and-answered-asymmetrically.md) is still defensible, narrowly.** That ADR defends opt-out on the grounds that a Diagnostic Report carries no identifier and no message. A masked replay carries neither: layout, colours and the position of rectangles. If masking ever stops holding, this joins the condition that ADR says would move Diagnostic Reports to opt-in.
- **The privacy policy and the store declarations change.** [`privacy.astro`](../../web/src/pages/privacy.astro) says a report may include a recording of the app's screens with all text and the calendar hidden, and the Privacy sheet in the app says the same in one line. The Play *Data safety* form has to carry it as a second purpose, *Diagnostics*, on the *App interactions* row; the table in [28](0028-telemetry-consent-is-asked-twice-and-answered-asymmetrically.md) records the form and says so.
- **A replay is uploaded only after an error, so it costs nothing on the happy path**, and its lowest quality setting keeps the upload small. Only the native SDKs implement it, so a replay exists on Android and iOS and nowhere else, and only while the app is in the foreground.
- **The masking API is marked experimental, and the analyzer is told not to say so.** `maskCallback` and
  `SentryMaskingDecision` carry the SDK's `@experimental` annotation, which `dart analyze --fatal-infos` reports as
  a warning and CI refuses. The per-line `// ignore:` the SDK suggests is a comment, and the source carries none
  ([ADR 0021](0021-the-source-carries-no-comments-and-the-documents-carry-the-reasons.md)), so
  [`analysis_options.yaml`](../../app/analysis_options.yaml) sets `experimental_member_use` to `ignore` for the
  whole app, beside the `invalid_annotation_target` that `freezed` already needed. The cost is that the next
  experimental API anyone reaches for is adopted silently too; the adapter is the one file that should ever need it.
- **`SentryWidget` is the only Sentry type outside `infrastructure/telemetry/`.** It sits in `main.dart`, the composition root that already constructs the adapter, and nowhere in `ui/`. A `SentryMask` or `SentryUnmask` in a feature widget would be the vendor reaching into the layer [27](0027-the-app-sends-telemetry-through-two-ports-with-no-failure-channel.md) kept it out of; the type set exists so that never has to happen.
- Where this bites: [`app/lib/infrastructure/AGENTS.md`](../../app/lib/infrastructure/AGENTS.md), [`app/lib/ui/AGENTS.md`](../../app/lib/ui/AGENTS.md), the app section of [`web/src/pages/privacy.astro`](../../web/src/pages/privacy.astro) and the *Telemetry* bullet in the root [`AGENTS.md`](../../AGENTS.md).
