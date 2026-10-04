# app/lib/application

Orchestration, in pure Dart. It composes `domain/` into whole operations. No Flutter, no Riverpod: a use case must
be constructible and testable with `const FetchContributions(repository: fake)` and nothing else on the stack. The
only place that builds one for the app is [`ui/di/providers.dart`](../ui/di/AGENTS.md).

## The use cases

| Class | Fronts | Returns |
| --- | --- | --- |
| `FetchContributions` | `ContributionRepository.fetchCalendar` | `({ ContributionCalendar calendar, bool fromCache })` |
| `InvalidateContributionCache` | `ContributionRepository.invalidateCache` | `Future<void>` |
| `ExportCalendar` | `ExportRepository.export` | `List<int>`: the encoded bytes |
| `FetchTipProducts` | `TipRepository.getTipProducts` | `List<TipProduct>` |
| `GiveTip` | `TipRepository.give` | `TipOutcome` |
| `SendContactMessage` | `ContactMessageRepository.deliver` | `Future<void>`: it either returns or throws a `Failure` |

**`SendContactMessage` is the one whose repository talks to this project's own server**, posting to `/api/contact`
([ADR 0030](../../../docs/adr/0030-contact-messages-leave-through-cloudflares-send-email-binding.md)). The use case
knows none of that: `ContactSheet` builds a `ContactMessage`, whose constructor is what rejects a bad address, and
hands it over.

Every `ContributionRepository` method has a use case, so no widget or notifier reads `contributionRepositoryProvider`;
`HomeScreenWidgetRefresh`, which the background isolate drives with no providers at all, calls `fetchCalendar`
itself. `ui/` does call the settings, Palette, Usage Event, diagnostics and export-delivery repositories through
their providers, with no use case in front.

## Who renders a failure

A use case lets what it calls propagate, so the caller decides. `FetchContributions` is the only one whose failure
reaches a notifier's state: `ViewerNotifier` catches `on Failure` and puts it into state without inspecting it, and
the text comes further out, from `FailureMessage.of`. `InvalidateContributionCache` runs from
`ViewerNotifier.refreshContributions`, ahead of the fetch, which catches its `CacheFailure`, reports it as a
Diagnostic Report and fetches anyway: a cache that cannot be cleared must not stop fresh data from arriving. The other four are called straight from `ConsumerState`
sheets, and each catches and renders a message through `FailureMessage.ofAny`:
[`tip_jar_sheet.dart`](../ui/features/tip/tip_jar_sheet.dart) for `FetchTipProducts` and `GiveTip`, `ExportSheet`
for `ExportCalendar`, `ContactSheet` for `SendContactMessage`.

## Gotchas

- **`fetchCalendar` returns a record carrying `fromCache`, and dropping it is a real regression.** The Viewer uses
  it to distinguish "this is what GitHub says right now" from "this is what we stored"; a signature returning only
  the calendar silently removes a person's ability to tell.
- **`GiveTip` returns a `TipOutcome`: whether the store sheet finished or the person backed out.** Backing out is an
  ordinary outcome, not an error and not a success, and it is what the Tip Jar needs to decide between "Thanks! ❤️"
  and saying nothing at all. It carries no receipt, no entitlement and no expiry
  ([ADR 0009](../../../docs/adr/0009-tips-are-unconditional-and-unlock-nothing.md)).
- `ExportCalendar` returns bytes, not a file path. Writing and sharing them is `infrastructure/export/` and the UI's
  share flow; this layer never touches the filesystem.
