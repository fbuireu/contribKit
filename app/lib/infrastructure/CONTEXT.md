# infrastructure/

Concrete implementations of domain interfaces. Can depend on pub packages but must not depend on Flutter widgets.

## Rules
- DTOs convert to domain entities at the boundary — DTOs never leak upward.
- Infrastructure exceptions must be caught here and converted to `Failure` subclasses before returning to callers.
- Never import from `ui/`.

## Subdirectories

| Directory | Contents |
|---|---|
| `github/` | `ContributionRepository` implementation: HTML scraping of `github.com/users/{username}/contributions` (no token) + Hive cache (1h TTL for the current year, indefinite for past years) |
| `github/dtos/` | JSON-deserializable transfer objects for the Hive cache; converted to entities before leaving this layer |
| `persistence/` | Hive adapters for settings |
| `assets/` | Repositories backed by the bundled `assets/*.json` (palettes, suggested usernames) — generated copies of `shared/` |
| `export/` | One repository implementation per export format (PNG, SVG, Markdown) |
| `purchase/` | RevenueCat implementation of the purchase repository (tip jar) |
