# infrastructure/

Concrete implementations of domain interfaces. Can depend on pub packages but must not depend on Flutter widgets.

## Rules
- DTOs convert to domain entities at the boundary — DTOs never leak upward.
- Infrastructure exceptions must be caught here and converted to `Failure` subclasses before returning to callers.
- Never import from `ui/`.

## Subdirectories

| Directory | Contents |
|---|---|
| `github/` | GraphQL client, `ContributionRepository` implementation, DTOs |
| `github/dtos/` | JSON-deserializable transfer objects; converted to entities before leaving this layer |
| `persistence/` | Hive / shared_preferences adapters for cache and settings |
| `export/` | One repository implementation per export format (PNG, SVG, Markdown) plus a composite |
