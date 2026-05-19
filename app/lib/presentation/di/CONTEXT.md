# presentation/di/

Dependency wiring — the single place that knows how to construct the full object graph.

`providers.dart` is the only file allowed to import from both `infrastructure/` and `application/` simultaneously. It instantiates concrete repositories and passes them to use cases, then exposes the results as `@riverpod` providers consumed by widgets and notifiers.
