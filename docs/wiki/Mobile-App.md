# Mobile App

The mobile component (`app/`) is a single Flutter codebase shipping native iOS & Android apps with home-screen widgets. State is managed with Riverpod; Tips go through RevenueCat.

- **Google Play:** [com.fbuireu.contribkit](https://play.google.com/store/apps/details?id=com.fbuireu.contribkit)
- **App Store:** coming soon

---

## Features

- **Native iOS & Android** from one Flutter codebase; home-screen widgets are Android-only, as `app/ios` carries no WidgetKit extension
- **All 11 palettes & 5 shapes:** the palettes are the web's own design tokens, mirrored from [`shared/palettes.json`](../../shared/palettes.json). **The shapes are not**: `CellShape` is a hardcoded Dart enum, and [`shapes.json`](../../shared/shapes.json) is bundled but has no Dart reader ([ADR 0002](../adr/0002-shared-design-tokens-mirrored-into-the-flutter-bundle.md))
- **Home-screen widgets (Android):** small (streak counter) and medium (grid, streak and total)
- **Daily background refresh:** fetches once a day, easy on the battery
- **Export & share:** PNG, SVG, or Markdown straight into the system share sheet
- **No login:** just a username, only public contribution data

---

## Architecture

Same DDD-ish layers as the web (see **[Architecture](Architecture)**):

```
app/lib/
├── domain/          entities, value objects, repository interfaces, services, failures
├── application/     use cases: fetch_contributions, invalidate_contribution_cache, export_calendar, fetch_tip_products, give_tip
├── infrastructure/  github repo, asset repos, export (png/svg/markdown), persistence, tip
└── ui/              features (viewer, customizer, export, tip), widgets, theme, DI (Riverpod)
```

The customizer offers palette, shape, **size** and background pickers: **Cell Size is app-only**, the web has no user-facing size at all ([ADR 0016](../adr/0016-cell-size-is-a-named-choice-in-the-app-and-fixed-geometry-on-the-web.md)). All four go through one `SettingPicker` (`palette_picker`, `shape_picker`, `size_picker`, `background_picker`). The viewer renders the contribution grid with a stats panel. State is held in `viewer_notifier` (Riverpod) over an immutable `viewer_state` (freezed).

### Contribution stats

`ContributionStatsService.compute(calendar)` derives a `ContributionStats` value object from the calendar, all pure, no I/O:

| Stat | How it's computed |
|------|-------------------|
| `currentStreak` / `longestStreak` | consecutive **active** days: `level != none`, never `count > 0`, so a day GitHub coloured but whose Count did not parse keeps the run alive |
| `bestDayCount` / `bestDayDate` | the single highest-Count day: **both `null` together** whenever any active day has an unknown Count, because the highest Count *seen* is only a lower bound |
| `totalDaysActive` | active days, on the same Contribution Level rule |
| `weeklyAverage` | `totalContributions / weekCount`, and `null` whenever the total is |
| `bestMonthContributions` / `bestMonth` | month with the highest summed Count, `null` on the same unknown-Count rule |

Every figure derived from Counts is nullable, and `null` means *not knowable* rather than zero
([ADR 0019](../adr/0019-an-unknown-count-is-null-in-both-clients.md)). Only the two streaks and
`totalDaysActive` stay non-nullable: they count days, which the Contribution Level answers alone. `bestMonth` names
a month by summed Count, so it is nulled by the same rule as everything else derived from one.
**Six of the eight are computed and rendered nowhere**: `StatsPanel` shows the two streaks and the calendar's own
total.

### Export

Three repositories implement the `ExportRepository` interface, each producing a different artifact for the system share sheet:

| Repository | Output |
|------------|--------|
| `png_export_repository_impl` | PNG raster |
| `svg_export_repository_impl` | SVG vector |
| `markdown_export_repository_impl` | Markdown embed snippet |

### State & dependency injection

[Riverpod](https://riverpod.dev) is the app's **DI container and reactive state layer**, living entirely inside `ui/`: it's the only layer that knows Flutter or Riverpod exist. It does not replace the DDD layering; it's the mechanism that wires that layering together and exposes it to widgets.

**Composition root.** [`ui/di/providers.dart`](../../app/lib/ui/di/providers.dart) (code-generated [`providers.g.dart`](../../app/lib/ui/di/providers.g.dart)) is the single place allowed to import `infrastructure/` and `application/` at the same time. It instantiates the concrete repositories (GitHub, assets, settings, tip, export), passes them into the curried use cases, and exposes each as an `@riverpod` provider:

```dart
@riverpod
ContributionRepository contributionRepository(Ref ref) =>
    GitHubContributionRepository();

@riverpod
FetchContributions fetchContributions(Ref ref) =>
    FetchContributions(repository: ref.watch(contributionRepositoryProvider));
```

The chain is **repository → use case → notifier**, the same inward dependency direction as the web: widgets depend on notifiers, notifiers depend on use cases, use cases depend on domain interfaces. Nothing flows outward.

**State.** Stateful screens use `@riverpod` notifier classes over immutable freezed state, e.g. `ViewerNotifier` holds `ViewerState`, mutating only via `state = state.copyWith(...)`. Widgets stay dumb: `ref.watch` to read state, `ref.read(notifier).method()` to act (no business logic in `build`). Persisted settings (username, palette, shape, size, background, theme) live behind `settings_repository_impl` (local persistence) and are read/written by notifiers through the repository, never directly.

### Why Riverpod

| Reason | What it buys |
|--------|-----------------|
| **Compile-time DI** | Providers are generated and statically typed: no runtime service locator, no `GetIt`-style string/type registry that can fail at runtime. |
| **Enforces the dependency direction** | The composition root is the *only* file that touches both `infrastructure/` and `application/`. Everywhere else consumes providers, so the inward-pointing layering can't be accidentally violated. |
| **No global singletons** | Repositories and use cases are scoped to the `ProviderContainer`, not module-level globals, so lifecycle and disposal are explicit. |
| **Reactive by default** | `ref.watch` rebuilds dependents automatically; derived providers (e.g. `palettes` watching `paletteRepository`) recompute when their inputs change. |
| **Testable** | Any provider can be swapped with `overrideWith` in tests, so notifiers run against fake repositories with no Flutter or network involved, matching the web's "domain knows nothing" testing story. |
| **Code generation** | `@riverpod` removes the boilerplate of hand-written `Provider`/`StateNotifierProvider` declarations and keeps provider names/types in sync. |

---

## Home-screen widgets

Android only: there is no iOS widget.

| Size | Provider | Shows |
|------|----------|-------|
| Small (80×40dp) | `ContribKitSmallWidgetProvider` | Streak counter |
| Medium (250×110dp) | `ContribKitWidgetProvider` | Username, streak badge, grid image and year total |

Widgets are driven by [`calendar_widget_service.dart`](../../app/lib/ui/features/widget/calendar_widget_service.dart) and refreshed by a daily background task.

---

> **Markdown export is an Embed, not a file.** It emits `![alt](https://contribkit.app/user/<name>.svg)`, the same
> snippet the web builds. It used to embed the SVG as a base64 `data:` URI, which GitHub does not render in
> Markdown, so the one surface the tile is labelled for ("README embed snippet") was the one it could not work on.

## Tips

ContribKit offers an optional **Tip Jar** via RevenueCat ([`revenuecat_tip_repository.dart`](../../app/lib/infrastructure/tip/revenuecat_tip_repository.dart)), surfaced in [`ui/features/tip/tip_jar_sheet.dart`](../../app/lib/ui/features/tip/tip_jar_sheet.dart). The use cases are `fetch_tip_products` (loads the available `TipProduct`s) and `give_tip`, which returns a `TipOutcome` so backing out of the store sheet is not reported as a failure. A Tip unlocks nothing and no code may check whether one was given ([ADR 0009](../adr/0009-tips-are-unconditional-and-unlock-nothing.md)). The glossary reserves **Tip** for this and lists "purchase" under `_Avoid_`, which is why none of these names says it. The default `dart-defines.json` carries the RevenueCat sandbox key; `dart-defines.prod.json` carries the production one.

## Development

The app is the `app/` package in the pnpm workspace, but built with Flutter:

```bash
cd app
flutter pub get
flutter run --dart-define-from-file=dart-defines.json
```

Build-time config is supplied via `dart-defines.json` (dev) and `dart-defines.prod.json` (prod). Design tokens come from `app/assets/*.json`, regenerated from `shared/` with `pnpm sync:assets`. See **[Project Structure](Project-Structure)** and **[Git Hooks](Git-Hooks)**.

---

## Shared design tokens

The app uses generated copies in `app/assets/*.json`. See **[shared/](../../shared/README.md)** and [ADR 0002](../adr/0002-shared-design-tokens-mirrored-into-the-flutter-bundle.md) for why. Always edit `shared/*.json` and run `pnpm sync:assets` (or rely on the lefthook pre-commit hook, which does it when you stage the change), and never edit `app/assets/` by hand. Note that this moves **palettes and suggested usernames only**: nothing in Dart reads `shapes.json`, so adding a shape there changes the web and does nothing here. [`release-app.yml`](../../.github/workflows/release-app.yml) re-copies them before building the AAB, but `ci-app.yml` does not, so a stale mirror reaches CI unnoticed except through the docs-consistency test. See **[Project Structure](Project-Structure)**.

---

## Releases

Built and **shipped to Google Play automatically** via `release-app.yml`. A manual dispatch picks a track (`internal` / `alpha` / `beta` / `production`); semantic-release then versions the app and, if there's something to publish, the pipeline signs and uploads a release App Bundle with `fastlane`, and even generates the Play Store release notes from `CHANGELOG.md`.

The `track` input picks the GitHub Environment, and the workflow writes that environment's `REVENUECAT_KEY` into `dart-defines.json` before building. Neither dart-defines file is read in CI, and neither is committed: `app/.gitignore` lists `dart-defines*.json` under its secrets heading, so they exist only as local, untracked files.

| `track` input | GitHub Environment | Target |
|---------------|--------------------|--------|
| `production` | `app-production` | Play production track |
| anything else | `app-development` | Chosen Play track + RevenueCat sandbox |

Versioned with semantic-release (`app-vX.Y.Z` tags). See **[CI/CD](CI-CD)** for the full delivery flow.
