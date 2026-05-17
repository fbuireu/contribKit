# ContribKit

[![CI](https://github.com/fbuireu/contribkit/actions/workflows/ci.yml/badge.svg)](https://github.com/fbuireu/contribkit/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/fbuireu/contribkit/branch/main/graph/badge.svg)](https://codecov.io/gh/fbuireu/contribkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Visualize and export your GitHub contribution calendar with full visual customization — custom palettes, gradients, shapes, and backgrounds. Export as PNG, SVG, or Markdown.

## Running locally

```bash
flutter run --dart-define=GITHUB_TOKEN=your_token_here
```

Generate a token at [github.com/settings/tokens](https://github.com/settings/tokens) with no scopes required (public data only).

## Development

```bash
# Install dependencies
flutter pub get

# Install lefthook (once, globally) and activate git hooks
brew install lefthook   # or: npm i -g @evilmartians/lefthook
lefthook install

# Watch for code generation changes
dart run build_runner watch --delete-conflicting-outputs

# Run tests
flutter test --coverage

# Analyze
flutter analyze
```
