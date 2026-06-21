# Mobile App

The mobile component (`app/`) is a single Flutter codebase shipping native iOS & Android apps with home-screen widgets. State is managed with Riverpod; in-app purchases use RevenueCat.

- **Google Play:** [com.fbuireu.contribkit](https://play.google.com/store/apps/details?id=com.fbuireu.contribkit)
- **App Store:** coming soon

---

## Features

- **Native iOS & Android** from one Flutter codebase, with platform-respecting widgets on both
- **All 11 palettes & 5 shapes:** the same design tokens as the web, loaded from `shared/`
- **Home-screen widgets:** small (streak counter), medium (full grid), large (both)
- **Daily background refresh:** fetches once a day, easy on the battery
- **Export & share:** PNG, SVG, or Markdown straight into the system share sheet
- **No login:** just a username, only public contribution data

---

## Architecture

Same DDD-ish layers as the web (see **[Architecture](Architecture)**):

```
app/lib/
├── domain/          entities, value objects, repository interfaces, services, failures
├── application/     use cases: fetch_contributions, export_calendar, fetch_tip_products, purchase_tip
├── infrastructure/  github repo, asset repos, export (png/svg/markdown), persistence, purchases
└── ui/              features (viewer, customizer, export, tip), widgets, theme, DI (Riverpod)
```

The customizer mirrors the web options: palette, shape, **size**, and background pickers (`palette_picker`, `shape_picker`, `size_picker`, `background_picker`). The viewer renders the contribution grid with a stats panel. State is held in `viewer_notifier` (Riverpod) over an immutable `viewer_state` (freezed).

### Contribution stats

`ContributionStatsService.compute(calendar)` derives a `ContributionStats` value object from the calendar, all pure, no I/O:

| Stat | How it's computed |
|------|-------------------|
| `currentStreak` / `longestStreak` | consecutive days with `count > 0` |
| `bestDayCount` / `bestDayDate` | the single highest-count day |
| `totalDaysActive` | days with any contributions |
| `weeklyAverage` | `totalContributions / weekCount` |
| `bestMonthContributions` / `bestMonthIndex` | month with the highest summed count |

### Export

Three repositories implement the `ExportRepository` interface, each producing a different artifact for the system share sheet:

| Repository | Output |
|------------|--------|
| `png_export_repository_impl` | PNG raster |
| `svg_export_repository_impl` | SVG vector |
| `markdown_export_repository_impl` | Markdown embed snippet |

### State & dependency injection

[Riverpod](https://riverpod.dev) is the app's **DI container and reactive state layer**, living entirely inside `ui/` — it's the only layer that knows Flutter or Riverpod exist. It does not replace the DDD layering; it's the mechanism that wires that layering together and exposes it to widgets.

**Composition root.** `ui/di/providers.dart` (code-generated `providers.g.dart`) is the single place allowed to import `infrastructure/` and `application/` at the same time. It instantiates the concrete repositories (GitHub, assets, settings, purchases, export), passes them into the curried use cases, and exposes each as an `@riverpod` provider:

```dart
@riverpod
ContributionRepository contributionRepository(Ref ref) =>
    GitHubContributionRepository();

@riverpod
FetchContributions fetchContributions(Ref ref) =>
    FetchContributions(repository: ref.watch(contributionRepositoryProvider));
```

The chain is **repository → use case → notifier**, the same inward dependency direction as the web: widgets depend on notifiers, notifiers depend on use cases, use cases depend on domain interfaces. Nothing flows outward.

**State.** Stateful screens use `@riverpod` notifier classes over immutable freezed state — e.g. `ViewerNotifier` holds `ViewerState`, mutating only via `state = state.copyWith(...)`. Widgets stay dumb: `ref.watch` to read state, `ref.read(notifier).method()` to act (no business logic in `build`). Persisted settings (username, palette, shape, size, background, theme) live behind `settings_repository_impl` (local persistence) and are read/written by notifiers through the repository, never directly.

### Why Riverpod

| Reason | What it buys |
|--------|-----------------|
| **Compile-time DI** | Providers are generated and statically typed — no runtime service locator, no `GetIt`-style string/type registry that can fail at runtime. |
| **Enforces the dependency direction** | The composition root is the *only* file that touches both `infrastructure/` and `application/`. Everywhere else consumes providers, so the inward-pointing layering can't be accidentally violated. |
| **No global singletons** | Repositories and use cases are scoped to the `ProviderContainer`, not module-level globals, so lifecycle and disposal are explicit. |
| **Reactive by default** | `ref.watch` rebuilds dependents automatically; derived providers (e.g. `palettes` watching `paletteRepository`) recompute when their inputs change. |
| **Testable** | Any provider can be swapped with `overrideWith` in tests, so notifiers run against fake repositories with no Flutter or network involved — matching the web's "domain knows nothing" testing story. |
| **Code generation** | `@riverpod` removes the boilerplate of hand-written `Provider`/`StateNotifierProvider` declarations and keeps provider names/types in sync. |

---

## Home-screen widgets

| Size | Shows |
|------|-------|
| Small | Streak counter |
| Medium | Full contribution grid |
| Large | Both |

Widgets are driven by `calendar_widget_service.dart` and refreshed by a daily background task.

---

## In-app purchases

ContribKit offers an optional **tip jar** via RevenueCat (`revenuecat_purchase_repository.dart`), surfaced in `ui/features/tip/tip_jar_sheet.dart`. The use cases are `fetch_tip_products` (loads the available `TipProduct`s) and `purchase_tip`. Tips are entirely optional, and every feature works without them. The `development` flavor uses the RevenueCat sandbox.

## Development

The app is the `app/` package in the pnpm workspace, but built with Flutter:

```bash
cd app
flutter pub get
flutter run --flavor development --dart-define-from-file=dart-defines.json
```

Build-time config is supplied via `dart-defines.json` (dev) and `dart-defines.prod.json` (prod). Design tokens come from `app/assets/*.json`, regenerated from `shared/` with `pnpm sync:assets`. See **[Project Structure](Project-Structure)** and **[Git Hooks](Git-Hooks)**.

---

## Shared design tokens

The app cannot import `shared/` directly (Flutter bundles only assets inside its own package), so it uses generated copies in `app/assets/*.json`. Always edit `shared/*.json` and run `pnpm sync:assets` (or rely on the lefthook pre-commit hook / CI), and never edit `app/assets/` by hand. See **[Project Structure](Project-Structure)**.

---

## Releases

Built and **shipped to Google Play automatically** via `release-app.yml`. A manual dispatch picks a track (`internal` / `alpha` / `beta` / `production`); semantic-release then versions the app and, if there's something to publish, the pipeline signs and uploads a release App Bundle with `fastlane`, and even generates the Play Store release notes from `CHANGELOG.md`.

| Flavor | GitHub Environment | Target |
|--------|--------------------|--------|
| `production` | `app-production` | Play production track |
| `development` | `app-development` | Internal Play track + RevenueCat sandbox |

Versioned with semantic-release (`app-vX.Y.Z` tags). See **[CI/CD](CI-CD)** for the full delivery flow.
