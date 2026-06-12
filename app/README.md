<div align="center">

<img src="../web/public/logo.svg" alt="ContribKit logo" width="96" height="96">

# ContribKit · App

**The iOS & Android app — render your contribution calendar, customize it, and pin it to your home screen as a widget.**

[![CI App](https://img.shields.io/github/actions/workflow/status/fbuireu/contribkit/ci-app.yml?style=flat-square&logo=github&label=CI%20App)](https://github.com/fbuireu/contribkit/actions/workflows/ci-app.yml)
[![Codecov](https://img.shields.io/codecov/c/gh/fbuireu/contribkit?style=flat-square&logo=codecov)](https://codecov.io/gh/fbuireu/contribkit)

**[Project overview](../README.md)** · **[Google Play](https://play.google.com/store/apps/details?id=com.fbuireu.contribkit)** · **App Store (soon)** · **[Web docs](../web/README.md)**

</div>

---

## Table of Contents

- [Features](#features)
- [Stack](#stack)
- [Architecture](#architecture)
- [Development](#development)
- [Home-Screen Widgets](#home-screen-widgets)
- [In-App Purchases](#in-app-purchases)
- [Releases](#releases)

---

## Features

- 📱 **Native iOS & Android:** one Flutter codebase, platform-respecting widgets on both
- 🎨 **All 11 palettes & 5 shapes:** the same design tokens as the web, loaded from [`shared/`](../shared)
- 🧿 **Home-screen widgets:** small (streak counter), medium (full grid), large (both)
- 🔋 **Daily background refresh:** fetches once a day, easy on the battery
- 📤 **Export & share:** PNG, SVG, or Markdown straight into the system share sheet
- 🔓 **No login:** just a username — only public contribution data

---

## Stack

| Concern             | Choice                                                              |
| ------------------- | -------------------------------------------------------------------- |
| Framework           | Flutter (stable channel)                                            |
| State management    | Riverpod (`riverpod_annotation` codegen)                            |
| Models              | freezed + json_serializable                                         |
| Persistence         | Hive (cache + settings)                                             |
| Widgets & refresh   | `home_widget` + `workmanager`                                       |
| UI primitives       | `shadcn_ui` (wrapped in `AppXxx` widgets) + `flutter_animate`       |
| In-app purchases    | RevenueCat (`purchases_flutter`)                                    |

---

## Architecture

Same DDD-ish layering as the web; each layer documents its rules in a colocated `CONTEXT.md`:

| Layer                                                    | Role                                                                  |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| **[domain](lib/domain/CONTEXT.md)**                       | Pure Dart business core: entities, value objects, typed `Failure`s    |
| **[application](lib/application/CONTEXT.md)**             | One class per use case, dependencies via constructor                  |
| **[infrastructure](lib/infrastructure/CONTEXT.md)**       | GitHub client, Hive persistence, export implementations               |
| **[infrastructure/github/dtos](lib/infrastructure/github/dtos/CONTEXT.md)** | JSON DTOs, converted to entities at the boundary    |
| **[ui](lib/ui/CONTEXT.md)**                               | Widgets + Riverpod providers — the only Flutter-aware layer           |
| **[ui/di](lib/ui/di/CONTEXT.md)**                         | All dependency wiring                                                 |
| **[ui/theme](lib/ui/theme/CONTEXT.md)**                   | Design tokens and semantic colors                                     |

---

## Development

```bash
flutter pub get
```

| Command                                                      | Action                              |
| ------------------------------------------------------------ | ----------------------------------- |
| `flutter run --dart-define=REVENUECAT_KEY=<key>`             | Run locally                         |
| `dart run build_runner watch --delete-conflicting-outputs`   | Watch codegen (riverpod, freezed)   |
| `flutter test --coverage`                                    | Run tests                           |
| `flutter analyze`                                            | Static analysis                     |

`REVENUECAT_KEY` is only needed to exercise the tip jar; the rest of the app runs without it.

Git hooks are repo-wide — see **[Monorepo Development](../README.md#monorepo-development)**.

---

## Home-Screen Widgets

Three sizes following each OS's widget conventions:

| Size   | Shows                       |
| ------ | --------------------------- |
| Small  | Streak counter              |
| Medium | Full 53×7 contribution grid |
| Large  | Both                        |

Widgets render with whatever palette you set in the app and refresh once a day in the background (`workmanager`), so the grid stays current without draining the battery.

---

## In-App Purchases

A simple **tip jar** ($1 / $5 / $10) built with the RevenueCat SDK and a custom Flutter UI (no RevenueCat Paywall builder). Tips are one-time, unlock nothing, and the app is fully functional without them.

---

## Releases

Driven by [`release-app.yml`](../.github/workflows/release-app.yml):

- **Versioning:** semantic-release tags `app-vX.Y.Z` and keeps a moving major tag (`app-vX`).
- **Build:** release AAB signed with the upload keystore (decoded from secrets at build time).
- **Publish:** fastlane uploads to the selected **Google Play track** (workflow input); `production` uses the `app-production` GitHub Environment, anything else uses `app-development` (internal track + RevenueCat sandbox).
- **Changelogs:** release notes are written to `android/fastlane/metadata/android/en-US/changelogs`.

See the **[root README](../README.md#monorepo-development)** for the environments naming convention shared with the web.
