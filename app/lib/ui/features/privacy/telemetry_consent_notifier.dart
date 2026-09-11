import 'package:contribkit/domain/value_objects/telemetry_consent.dart';
import 'package:contribkit/ui/di/providers.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'telemetry_consent_notifier.g.dart';

@riverpod
class TelemetryConsentNotifier extends _$TelemetryConsentNotifier {
  @override
  TelemetryConsent build() {
    _load();
    return const TelemetryConsent();
  }

  Future<void> _load() async {
    final settings = await ref.read(settingsRepositoryProvider).load();
    if (!ref.mounted) return;
    state = settings.telemetryConsent;
    await _apply(settings.telemetryConsent);
  }

  Future<void> setDiagnosticReports({required bool granted}) =>
      _choose(state.copyWith(diagnosticReports: _choiceFor(granted)));

  Future<void> setUsageEvents({required bool granted}) =>
      _choose(state.copyWith(usageEvents: _choiceFor(granted)));

  Future<void> acceptAll() => _choose(
    const TelemetryConsent(
      diagnosticReports: ConsentChoice.granted,
      usageEvents: ConsentChoice.granted,
    ),
  );

  Future<void> rejectAll() => _choose(
    const TelemetryConsent(
      diagnosticReports: ConsentChoice.denied,
      usageEvents: ConsentChoice.denied,
    ),
  );

  Future<void> _choose(TelemetryConsent next) async {
    state = next;
    await ref.read(settingsRepositoryProvider).saveTelemetryConsent(next);
    await _apply(next);
  }

  Future<void> _apply(TelemetryConsent consent) async {
    await ref
        .read(diagnosticsRepositoryProvider)
        .applyConsent(granted: consent.mayReportDiagnostics);
    await ref
        .read(usageEventRepositoryProvider)
        .applyConsent(granted: consent.mayRecordUsageEvents);
  }

  static ConsentChoice _choiceFor(bool granted) =>
      granted ? ConsentChoice.granted : ConsentChoice.denied;
}
