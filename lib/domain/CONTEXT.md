# domain/

The business core. Pure Dart only — zero external dependencies, no Flutter, no Riverpod, no `dart:ui`.

## Rules
- Only `dart:core` and `dart:async` are allowed.
- Colors are represented by the project's own `Color` value object, never `dart:ui.Color`.
- All public classes and methods must have `///` doc comments.
- Errors are `Failure` subclasses — never raw `Exception` or `String`.

## Subdirectories

| Directory | Contents |
|---|---|
| `entities/` | Rich objects with identity (`ContributionCalendar`, `ContributionDay`) |
| `value_objects/` | Immutable, validated, equality-by-value types (`Username`, `Year`, `Color`, `Palette`) |
| `repositories/` | Abstract interfaces only — no implementations |
| `services/` | Domain logic that doesn't belong to a single entity |
| `failures/` | Sealed class hierarchy of typed errors |
