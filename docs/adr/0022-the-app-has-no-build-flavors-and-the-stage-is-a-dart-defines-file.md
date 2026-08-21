# 22. The app has no build flavors and the stage is a dart-defines file

Date: 2026-08-21

## Status

Accepted. Recorded late: six documents assert the fact and none of them said why, so a contributor meeting a failing `--flavor` had no way to tell a decision from an omission.

## Context

The app ships to two places. The internal Play track runs against RevenueCat's sandbox; production runs against RevenueCat's live project. Something has to select between them at build time.

The Flutter convention is a build flavor: a Gradle `productFlavors` block, a flavour dimension, a `--flavor` argument on every run and build command, and usually a suffixed `applicationId` so both stages can sit on one device.

That convention is sized for a real difference between stages. Here the difference is **one string**. `dart-defines.json` and `dart-defines.prod.json` each contain a single key, `REVENUECAT_KEY`, and `main.dart` reads it with `String.fromEnvironment`. Nothing else about the two builds differs: same `applicationId`, same signing config, same assets, same entitlements, same endpoints, because the app talks to GitHub's public page and to no backend of ours ([5](0005-scrape-githubs-public-contributions-html.md), [11](0011-keep-the-apps-own-scraper-for-now.md)).

Side-by-side installation was never a goal either. There is one `applicationId`, `com.fbuireu.contribkit`, and a sandbox build is something a developer runs, not something a person keeps installed next to the real app.

## Decision

**There are no build flavors. The stage is whichever `dart-defines` file is passed**, and `--flavor` fails because there is nothing for it to name.

Locally that is `flutter run --dart-define-from-file=dart-defines.json` for the sandbox and `dart-defines.prod.json` for production. In CI it is the `track` input to `release-app.yml`, which selects the GitHub Environment whose `REVENUECAT_KEY` secret is written into `dart-defines.json` at build time.

The rejected alternative is the Flutter convention. It was rejected because a flavour dimension exists to vary the *build*, and nothing about this build varies. Adding one would put a Gradle block, a second signing path and an extra argument on every command in front of a single string that `String.fromEnvironment` already delivers.

## Consequences

- **`--flavor development` does not work and never did.** It is the first thing someone reaches for, and it produced a wrong command in the published wiki, which is one of the errors that motivated [15](0015-the-maintenance-contract-is-enforced-by-a-test.md).
- **Forgetting `--dart-define-from-file` is not an error.** `String.fromEnvironment` returns an empty string, `main.dart` returns before `Purchases.configure` rather than configuring with nothing, and `getProducts` then throws where the repository converts it to a `TipFailure`, which the sheet renders as `TipJarUnavailable`. That is a legitimate state ([9](0009-tips-are-unconditional-and-unlock-nothing.md) makes the app fully functional without Tips), so a missing flag looks like a working build with an empty Tip Jar.
- **The two stages cannot be installed side by side**, because they share an `applicationId`. Installing the other stage replaces the first, along with its Hive boxes.
- **This is cheap to reverse and stays reversible while the difference is one key.** The moment a second value has to vary per stage, and especially if it has to vary in Gradle rather than in Dart, reopen this.
- Where it bites: the **Gotchas** in `CLAUDE.md`, the app section of `ARCHITECTURE.md`, the app setup in `CONTRIBUTING.md`, the environment mapping in `README.md`, and `docs/wiki/CI-CD.md`.
