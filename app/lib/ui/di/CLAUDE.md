# app/lib/ui/di

Dependency wiring — the one place that knows how to construct the full object graph.

`providers.dart` is **the only file allowed to import from `infrastructure/` and `application/` at the same time.**
It instantiates concrete repositories, passes them into use cases, and exposes the results as `@riverpod` providers
for widgets and notifiers to watch. Everything else in `ui/` sees a provider, never a constructor.

## Invariants & rules

- **Every provider is generated.** `part 'providers.g.dart'` plus `@riverpod` on a top-level function — run
  `dart run build_runner build` after adding, renaming or changing the return type of one. The generated file is
  committed.
- **A repository provider returns the domain *interface*, not the implementation.** `ContributionRepository`, not
  `GitHubContributionRepository`. That is what makes an override in a test a one-liner, and what keeps the return
  type honest about the dependency direction.
- **Use-case providers compose from repository providers with `ref.watch`,** never by constructing a repository
  inline. One repository, one provider, one construction site.
- **No widget constructs anything.** If a widget imports from `infrastructure/`, the wiring is in the wrong place.

## The shape

Three tiers, in dependency order, plus one notifier that does not fit them:

1. **Repository providers** — `paletteRepository`, `suggestedUsernameRepository`, `contributionRepository`,
   `purchaseRepository`, `settingsRepository`, and one export repository per format.
2. **Use-case providers** — `fetchTipProducts`, `purchaseTip`, `fetchContributions`, and `exportCalendar`, which
   takes an `ExportFormat` and is therefore one provider rather than one per format.
3. **Async data providers** — `palettes`, `suggestedUsernames`, which await a repository's load and are consumed as
   an `AsyncValue`.

**`ThemeModeNotifier` also lives here, and it is the one thing in this file that holds state.** It belongs beside a
feature by the rule below; it is here because the theme is app-wide chrome that `main.dart` watches before any
feature exists, and because moving it means regenerating `providers.g.dart`. Treat it as the documented exception,
not as a precedent — the next stateful thing goes in its feature.

## Gotchas

- **There is one export *repository* provider per Export Format, and one export *use-case* provider for all of
  them.** `ExportRepository` is a single interface with three implementations, and Riverpod keys on the provider
  rather than the return type, so the repository tier genuinely needs three. The use-case tier does not:
  `exportCalendar(format)` is a family that switches over `ExportFormat` and hands back the matching repository.
  This guide claimed the whole thing could not be collapsed, and each of the three widgets that chose a format
  therefore hard-coded its own filename and MIME type — which is how `ExportPanel` came to share Markdown as a
  `.md` file while `ExportSheet` copied it to the clipboard. A new format is now a repository, a repository
  provider, and one `ExportFormat` case.
- **The background isolate has no `ProviderScope`, and therefore no providers at all.** `callbackDispatcher` in
  `app/lib/main.dart` constructs `AssetPaletteRepository()`, `GitHubContributionRepository()` and
  `HiveSettingsRepository()` by hand. Adding a
  constructor argument to either means editing `main.dart` too — the analyzer catches that particular case, but not
  a *behavioural* dependency that only the provider sets up.
- **`providers.dart` is the seam a test overrides.** Prefer `ProviderScope(overrides: [...])` over reaching into a
  notifier; a use case that has to be faked some other way is a sign the wiring skipped this file.
- **`markdownExportRepository` is built from `svgExportRepository`,** not independently — the Markdown export embeds
  the SVG. It is the only provider in this file that depends on another repository provider, and the reason the
  three export repositories are not interchangeable.
- **`AppThemeMode.system` does not mean "follow the system".** `ThemeModeNotifier` maps `system` to
  `ThemeMode.dark`, and `cycle()` only ever alternates light and dark, so the case exists in the domain enum and in
  the settings box without ever selecting system behaviour. Either the app grows real system support or the case
  goes; do not read the enum as evidence that it already works.
- Nothing else here holds state. A provider that starts caching a value between reads belongs in a notifier next to
  the feature that owns it.
