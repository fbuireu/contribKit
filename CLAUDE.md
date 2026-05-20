# ContribKit — Agent Instructions

A Flutter app for visualizing GitHub contribution calendars with full visual customization (palettes, gradients, shapes, backgrounds) and multi-format export (PNG, SVG, Markdown).

This document is the source of truth for any AI coding agent working on this codebase. Read it fully before making changes.

## Project Overview

- **Type**: Cross-platform Flutter app (mobile-first; desktop and web later).
- **Language**: Dart (latest stable).
- **State management**: Riverpod with code generation (`@riverpod`).
- **Architecture**: Clean Architecture — `domain` / `application` / `infrastructure` / `ui`.
- **Data source**: GitHub public contribution HTML (`github.com/users/{login}/contributions`). No auth token required — scrapes the same page GitHub loads on public profiles.
- **Design system**: `shadcn_ui` for UI primitives, with a custom token layer on top. No `MaterialApp` chrome.

## Project Identifiers

These are fixed. Never regenerate, rename, or "clean up" without explicit approval — they are tied to store listings, signing keys, and analytics.

- **Application ID (Android)**: `com.fbuireu.contribkit`
- **Bundle Identifier (iOS)**: `com.fbuireu.contribkit`
- **Package name (Dart)**: `contribkit`
- **Display name**: `ContribKit`
- **Console**: project is already registered in Google Play Console and App Store Connect under the IDs above.

When configuring native projects:

- `android/app/build.gradle`: `applicationId "com.fbuireu.contribkit"`.
- `ios/Runner.xcodeproj`: `PRODUCT_BUNDLE_IDENTIFIER = com.fbuireu.contribkit`.
- `pubspec.yaml`: `name: contribkit`.
- Deep links, intent filters, and universal links must use `com.fbuireu.contribkit` as scheme/host base.

## Non-Negotiable Rules

These rules are absolute. Do not bypass them, even if asked to do so casually.

1. **The `domain/` layer has zero external dependencies.** No Flutter imports, no Riverpod, no `dart:ui`, no HTTP clients, no JSON libraries. Only `dart:core` and `dart:async`. If you need a color in the domain, use the project's own `Color` value object — never `dart:ui.Color`.
2. **Dependency direction is inward.** `ui` → `application` → `domain`. `infrastructure` implements `domain` interfaces. Never import outward.
3. **Riverpod lives only in `ui/`.** Use cases, repositories, and entities never know Riverpod exists.
4. **Use cases receive dependencies via constructor.** No service locator inside use cases, no `ref.read` inside domain or application.
5. **All public APIs are typed.** No `dynamic` unless interfacing with raw JSON, and even then convert at the boundary.
6. **Errors are typed as `Failure` subclasses.** Never throw raw `Exception` or `String` from domain or application code. Infrastructure can throw library-specific errors but must convert them to `Failure` at the repository boundary.
7. **Value objects validate on construction.** If a `Username` exists as an object, it is valid. No `if (username.isValid)` checks scattered across the codebase.
8. **TypeScript-style strictness in Dart**: prefer `final`, prefer immutability, prefer named parameters for anything with more than two arguments.

## Code Style

- **Formatting**: `dart format` with default settings. Run before committing.
- **Linting**: `flutter_lints` + `riverpod_lint` + `custom_lint`. CI fails on warnings.
- **Imports**: package imports first, then relative. No unused imports. Use `import_sorter` conventions.
- **Naming**:
    - Files: `snake_case.dart`.
    - Classes / enums / typedefs: `PascalCase`.
    - Variables / functions: `camelCase`.
    - Constants: `camelCase`, not `SCREAMING_SNAKE_CASE`.
    - Private members: leading underscore (`_internalThing`).
- **Documentation**: every public class and method in `domain/` and `application/` must have a `///` doc comment. Infrastructure and ui only when non-obvious.
- **No magic numbers**: extract to named constants. Especially for layout (cell size, gap, padding).
- **Prefer composition over inheritance.** Use mixins sparingly and only for cross-cutting concerns.

## Architecture Layers

### `lib/domain/`

Pure Dart. The business core.

- `entities/`: rich objects with identity (`ContributionCalendar`, `ContributionDay`).
- `value_objects/`: immutable, validated, equality by value (`Username`, `Year`, `Color`, `Palette`).
- `repositories/`: **interfaces only** (`abstract class`). No implementations.
- `services/`: domain services for logic that doesn't belong to an entity.
- `failures/`: sealed class hierarchy of typed errors.

### `lib/application/`

Pure Dart. Orchestrates domain to fulfill user intent.

- `use_cases/`: one class per use case, single public method named `call`. Receives repository interfaces via constructor.
- Use cases are stateless. State lives in ui.

### `lib/infrastructure/`

Implementations of domain interfaces. Can depend on packages (http, hive, etc.) but should not depend on Flutter widgets.

- `github/`: HTML-scraping repository implementation + DTOs for cache serialization.
- `persistence/`: Hive / shared_preferences adapters.
- `export/`: one repository implementation per export format, plus a composite.
- `rendering/`: implementations of rendering services (`FlutterCanvasRenderer`, `SvgStringRenderer`).
- DTOs convert to domain entities at the boundary. Never leak DTOs upward.

### `lib/ui/`

Flutter widgets + Riverpod providers.

- `di/providers.dart`: all dependency wiring. This is the **only** place that knows how to construct infrastructure.
- `features/<feature>/`: feature-scoped widgets, notifiers, and view models.
- Widgets are dumb: they `ref.watch` state and `ref.read(notifier).method()` to act.
- No business logic in widgets. If a `build` method has more than trivial conditionals, extract to a notifier or use case.

## Design System

ContribKit does **not** use Material visuals. The UI must look like a modern dev tool (think Linear, Raycast, Vercel dashboard), not a Google app. We use `shadcn_ui` as the primitive layer and build our own opinionated wrapper on top.

### Layering

```
┌─────────────────────────────────────────┐
│  Feature widgets (PalettePicker, etc.)  │  ← consume AppXxx widgets only
├─────────────────────────────────────────┤
│  App-level widgets (AppButton, AppCard) │  ← thin wrappers over shadcn_ui
├─────────────────────────────────────────┤
│  shadcn_ui primitives                   │  ← ShadButton, ShadCard, ShadSelect…
├─────────────────────────────────────────┤
│  Design tokens (colors, spacing, radii) │  ← single source of truth
└─────────────────────────────────────────┘
```

Feature widgets never import `shadcn_ui` directly. They consume `AppButton`, `AppCard`, `AppSelect`, etc. This way, if we replace shadcn or fork it, the change is isolated to one layer.

### Tokens — single source of truth

All visual constants live in `ui/theme/tokens.dart`. No magic numbers in widgets, no hardcoded hex codes, no inline `EdgeInsets.all(16)`.

```dart
// ui/theme/tokens.dart
abstract final class Tokens {
  // Spacing — 4px base scale
  static const space1 = 4.0;
  static const space2 = 8.0;
  static const space3 = 12.0;
  static const space4 = 16.0;
  static const space6 = 24.0;
  static const space8 = 32.0;

  // Radii
  static const radiusSm = 4.0;
  static const radiusMd = 8.0;
  static const radiusLg = 12.0;
  static const radiusFull = 9999.0;

  // Durations
  static const durationFast = Duration(milliseconds: 120);
  static const durationBase = Duration(milliseconds: 200);
  static const durationSlow = Duration(milliseconds: 320);
}
```

### Theme — semantic colors, not raw

Colors are exposed semantically (`background`, `foreground`, `muted`, `accent`, `border`), never as raw values from widgets. Mirrors the shadcn / Tailwind convention.

```dart
// ui/theme/app_colors.dart
class AppColors {
  final Color background;
  final Color foreground;
  final Color card;
  final Color cardForeground;
  final Color muted;
  final Color mutedForeground;
  final Color border;
  final Color accent;
  final Color accentForeground;
  final Color destructive;
  // ...
  const AppColors({...});

  static const light = AppColors(...);
  static const dark = AppColors(...);
}
```

The shadcn theme is configured from these same tokens, so a `ShadButton` and an `AppButton` look consistent automatically.

### Typography

- **Sans**: Inter Variable.
- **Mono**: JetBrains Mono (used in SVG snippet preview and Markdown copy block).
- **Sizes**: defined as tokens (`textXs`, `textSm`, `textBase`, `textLg`, `textXl`).

### Theming `shadcn_ui`

Configure the `ShadApp` (not `MaterialApp`) at the root, with our tokens injected:

```dart
ShadApp(
  theme: ShadThemeData(
    brightness: Brightness.dark,
    colorScheme: ShadColorScheme(
      background: AppColors.dark.background,
      foreground: AppColors.dark.foreground,
      // ...
    ),
    radius: BorderRadius.circular(Tokens.radiusMd),
  ),
  home: const ViewerScreen(),
);
```

### Rules

1. **Never use `MaterialApp`.** Use `ShadApp` as the root.
2. **Never import `package:flutter/material.dart` in feature widgets.** If you need a Material widget for something specific (e.g., `Scaffold` for snackbars), wrap it in an `AppXxx` and isolate the import there.
3. **Never instantiate `ShadButton` / `ShadCard` / etc. directly in feature widgets.** Always go through `AppButton` / `AppCard`.
4. **Never hardcode colors or spacing.** Use `Tokens` and `AppColors`.
5. **Dark mode is first-class.** Both themes (`light` and `dark`) must look intentional. Default is dark — devs prefer dark.
6. **The CustomPainter (calendar renderer) reads from the same tokens.** Consistency between UI chrome and the calendar itself is critical because the calendar is the product.
7. **Animations use `flutter_animate`**, not raw `AnimationController`, unless there's a measurable performance reason. Durations come from `Tokens`.

### Visual reference

When in doubt about visual decisions, the reference is in this order:

1. shadcn/ui (web) — primary reference for component look and behavior.
2. Linear, Raycast, Vercel — for overall app composition and density.
3. GitHub's own modern UI — for the specific domain of contribution visualization.

Material Design docs are **not** a reference. Cupertino is **not** a reference.

## Adding a New Feature — Workflow

When asked to add a new feature, follow this order strictly:

1. **Model the domain first.** Define entities, value objects, and the repository interface in `domain/`.
2. **Write the use case.** Pure Dart class in `application/use_cases/`. Write its unit tests immediately, using fakes.
3. **Implement the infrastructure.** Concrete repository in `infrastructure/`. Write integration tests if it touches external services.
4. **Wire it in providers.** Add the necessary `@riverpod` providers in `ui/di/providers.dart`.
5. **Build the UI.** Create the widget and a notifier that calls the use case.
6. **Write widget tests** for the new UI.

Do not skip steps. Do not start with the widget.

## Testing

- **Unit tests**: every use case, every value object, every domain service. Target: 100% coverage for `domain/` and `application/`.
- **Integration tests**: for each infrastructure repository against a real or recorded fixture (use VCR-style cassettes for GitHub API).
- **Widget tests**: for each screen and complex widget. Mock notifiers with `ProviderScope.overrides`.
- **Golden tests**: for the calendar rendering and exported SVG output. Critical because rendering is the core product.
- **No mocks in unit tests** — use hand-written fakes. Mocks are reserved for widget tests where stubbing notifiers is necessary.

Run tests with:

```bash
flutter test
flutter test --coverage
```

## Dependencies

Manage with Renovate (config in `renovate.json`). Rules:

- **Never add a dependency without justification.** Check if the standard library or an existing dependency covers it.
- **Prefer maintained packages.** Check pub.dev score, last publish date, and Flutter Favorite status.
- **Avoid these patterns**:
    - Packages with `_platform_interface` you don't strictly need.
    - Packages with native code unless the feature requires it (widgets, file system, etc.).
    - State management packages other than `flutter_riverpod` / `riverpod_annotation`.
- **Always pin major versions** in `pubspec.yaml`. Renovate handles minor/patch.

Required core dependencies:

```yaml
flutter_riverpod
riverpod_annotation
freezed_annotation
json_annotation
http             # for HTTP requests (contribution scraping + exports)
hive_flutter     # for cache and settings persistence
share_plus       # for export sharing
shadcn_ui        # UI primitives — never bypass for raw Material widgets
```

Required dev dependencies:

```yaml
build_runner
riverpod_generator
freezed
json_serializable
riverpod_lint
custom_lint
flutter_lints
mocktail         # only for widget tests
```

## Code Generation

This project uses `build_runner`. Run after any change to `@freezed`, `@riverpod`, or `@JsonSerializable`:

```bash
dart run build_runner watch --delete-conflicting-outputs
```

Generated files (`*.freezed.dart`, `*.g.dart`) are committed to the repo to keep CI fast. Never edit them by hand.

## GitHub Data Fetching

- **No authentication required.** Uses the public endpoint `github.com/users/{login}/contributions?from=YYYY-01-01&to=YYYY-12-31`.
- **HTML scraping**, not a formal API. Parses `<td class="ContributionCalendar-day">` cells and sibling `<tool-tip>` elements to extract date + count pairs.
- **Caching via Hive**: past years are cached forever (they never change). The current year is cached for 1 hour.
- **Errors to handle**: 404 → `NotFoundFailure`, non-200 → `NetworkFailure`, empty parse result → `NotFoundFailure`, network exception → `NetworkFailure`.
- **Do not add a GraphQL client.** No token is required and HTML scraping covers all public data needed.

## Commit Style

Conventional Commits. Examples:

- `feat(viewer): add Catppuccin palette`
- `fix(export): correct SVG viewBox dimensions`
- `refactor(domain): extract ContributionLevel value object`
- `test(application): cover FetchContributions edge cases`
- `chore(deps): bump flutter_riverpod to 2.5.2`

Scope is the feature or layer. No emoji. No trailing period.

## What to Do When Stuck

If you're about to:

- Add a package to "make things easier" → stop, justify it, propose alternatives.
- Bypass the architecture "just this once" → stop, ask the maintainer.
- Add a TODO comment → don't. Either do it now or open an issue.
- Suppress a lint with `// ignore:` → don't. Fix the underlying issue or discuss the lint.

When in doubt, prefer **fewer abstractions** over more. Add a layer only when there's a concrete second implementation in sight.

## What This Project Is Not

- It is not a social network. No following, no profiles beyond the local user.
- It is not a CI tool. No webhook integrations.
- It is not a GitHub client. We only read public contribution data.
- It is not a real-time dashboard. Daily cache is fine.

Keep scope tight. New ideas go in `IDEAS.md`, not in the codebase.

## Reference Files

- `README.md` — public-facing project description.
- `ARCHITECTURE.md` — deeper architecture rationale and diagrams.
- `DESIGN.md` — design system reference, token values, component catalog.
- `IDEAS.md` — backlog of features for future versions.
- `renovate.json` — dependency update rules.
- `analysis_options.yaml` — lint configuration.