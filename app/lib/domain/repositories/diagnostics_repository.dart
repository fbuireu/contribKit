abstract interface class DiagnosticsRepository {
  Future<void> start();

  Future<void> report({required Object error, StackTrace? stackTrace});

  Future<void> applyConsent({required bool granted});
}
