# app/lib/ui/di

Dependency wiring: the one place that knows how to construct the full object graph.

[`providers.dart`](./providers.dart) is **the only file allowed to import from `infrastructure/` and `application/` at the same time.**
It instantiates concrete repositories, passes them into use cases, and exposes the results as `@riverpod` providers
for widgets and notifiers to watch. Everything else in `ui/` sees a provider, never a constructor, and a test
overrides a provider here rather than reaching into a notifier. Run `dart run build_runner build` after adding,
renaming or changing the return type of one; [`providers.g.dart`](./providers.g.dart) is committed.

## The shape

Three tiers, in dependency order, plus one notifier that does not fit them:

1. **Repository providers**: `paletteRepository`, `suggestedUsernameRepository`, `contributionRepository`,
   `contactMessageRepository`, `tipRepository`, `settingsRepository`, `exportDelivery`, and one export repository
   per format. **`diagnosticsRepository` and `usageEventRepository` hold SDK state and are `keepAlive` for that
   reason**: they must survive a sheet closing. `telemetryConfig`, which both read, is `keepAlive` because a
   `keepAlive` provider may only read other `keepAlive` ones, which `riverpod_lint` enforces.
   Reading `settingsRepositoryProvider` from one of them is therefore a lint error, and that is why
   `TelemetryConsentNotifier` is **not** `keepAlive`: it reads settings, so it stays auto-dispose and is held alive
   instead by `ContribKitApp` watching it, the same way it watches the theme.
2. **Use-case providers**: `fetchTipProducts`, `giveTip`, `fetchContributions`, `invalidateContributionCache`,
   `sendContactMessage`, and `exportCalendar`, which takes an `ExportFormat` and is therefore one provider rather
   than one per format. Every `ContributionRepository` method has a use case, so no widget or notifier reads
   `contributionRepositoryProvider`. `ui/` does read the settings, Palette, Usage Event, diagnostics and
   export-delivery repository providers directly, with no use case in front.
3. **Async data providers**: `palettes`, `suggestedUsernames`, which await a repository's load and are consumed as
   an `AsyncValue`. Both carry `@Riverpod(retry: _neverRetry)`: Riverpod 3 re-runs a provider that throws up to ten
   times, doubling the delay from 200ms to a 6.4s ceiling, and reports `AsyncLoading` the whole time, while a bundled
   asset unreadable on the first attempt is unreadable on the tenth. `PalettePicker` and the Viewer's suggestion row
   render nothing while loading, so a retry would hide the failure for the length of the backoff. The contributions
   fetch does not go through a provider at all.

**`contributionRepositoryProvider` and `contactMessageRepositoryProvider` are `keepAlive`, because each owns one
`http.Client` for the life of the app.** Neither provider closes its client; `close()` exists on both repositories
for a caller that builds one by hand, which is the background isolate in [`main.dart`](../../main.dart) for the
GitHub one, closed with Hive in a `finally` because it runs outside any `ProviderScope`, and only the tests for the
contact one. The repository tests inject a client, and `close()` shuts only a client the repository built itself,
so none of them can see a close mid-request; `providers_test.dart` reads each of the two twice across a turn of the
event loop and asserts the same instance comes back, which fails on an auto-dispose version.

**`clockProvider` is the app's one clock**: a `keepAlive` `DateTime Function()` answering `DateTime.now`, which the
Viewer reads its `today` from and `contributionRepository`, `contactMessageRepository` and `settingsRepository` pass
to their repository as `now`, so a test that overrides it says what day it is everywhere at once; `appOverrides`
overrides it with `testToday`. It is `keepAlive` because the two `keepAlive` HTTP repository providers read it.

**`ThemeModeNotifier` also lives here, and it is the one thing in this file that holds state**, because the theme is
app-wide chrome that [`main.dart`](../../main.dart) watches before any feature exists, and because moving it means
regenerating `providers.g.dart`. `cycle()` records `UsageEvent.themeChanged` with the `AppThemeMode` it moved to,
read from `usageEventRepositoryProvider` before the settings write is awaited; the notifier is auto-dispose, so
reading a `keepAlive` provider from it is the direction `riverpod_lint` allows.

## Gotchas

- **There is one export *repository* provider per Export Format, and one export *use-case* provider for all of
  them.** `ExportRepository` is a single interface with three implementations, and Riverpod keys on the provider
  rather than the return type, so the repository tier genuinely needs three. The use-case tier does not:
  `exportCalendar(format)` is a family that switches over `ExportFormat` and hands back the matching repository, so
  no widget that chooses a format spells a filename or a MIME type of its own. A new format is a repository, a
  repository provider, and one `ExportFormat` case.
- **The background isolate has no `ProviderScope`, and therefore no providers at all.** `callbackDispatcher` in
  `app/lib/main.dart` hands `HiveSettingsRepository()`, `AssetPaletteRepository()` and
  `GitHubContributionRepository()` to `HomeScreenWidgetRefresh` by hand: one construction and one call.
  Adding a constructor argument to any of the three means editing `main.dart` too; the analyzer catches that
  particular case, but not a *behavioural* dependency that only the provider sets up. With no `clockProvider`
  there, each of them and `HomeScreenWidgetRefresh` read the clock through a `now` that defaults to `DateTime.now`.
- **`markdownExportRepository` is a `const` construction.** The Markdown Export is a README snippet around an Embed
  URL, so it needs no renderer, and no repository provider in this file depends on another.
- **`AppThemeMode.system` does not mean "follow the system".** `ThemeModeNotifier` maps `system` to
  `ThemeMode.dark`, and `cycle()` only ever alternates light and dark, so the case exists in the domain enum and in
  the settings box without ever selecting system behaviour. Either the app grows real system support or the case
  goes; do not read the enum as evidence that it already works.
