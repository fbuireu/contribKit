# application/

Orchestrates domain objects to fulfil user intent. Pure Dart — no Flutter, no Riverpod.

## Rules
- One class per use case, single public method named `call`.
- Dependencies injected via constructor — no service locator, no `ref.read`.
- Use cases are stateless; state lives in `presentation/`.
- All public classes and methods must have `///` doc comments.

## Subdirectories

| Directory | Contents |
|---|---|
| `use_cases/` | One file per use case (e.g. `fetch_contributions.dart`) |
