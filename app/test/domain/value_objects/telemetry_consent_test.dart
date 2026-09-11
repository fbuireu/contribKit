import 'package:contribkit/domain/value_objects/telemetry_consent.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('TelemetryConsent', () {
    test('sends Diagnostic Reports until someone says no', () {
      expect(const TelemetryConsent().mayReportDiagnostics, isTrue);
      expect(
        const TelemetryConsent(diagnosticReports: ConsentChoice.granted)
            .mayReportDiagnostics,
        isTrue,
      );
      expect(
        const TelemetryConsent(diagnosticReports: ConsentChoice.denied)
            .mayReportDiagnostics,
        isFalse,
      );
    });

    test('sends no Usage Event until someone says yes', () {
      expect(const TelemetryConsent().mayRecordUsageEvents, isFalse);
      expect(
        const TelemetryConsent(usageEvents: ConsentChoice.denied)
            .mayRecordUsageEvents,
        isFalse,
      );
      expect(
        const TelemetryConsent(usageEvents: ConsentChoice.granted)
            .mayRecordUsageEvents,
        isTrue,
      );
    });

    test('is answered only when both halves have been answered', () {
      expect(const TelemetryConsent().isAnswered, isFalse);
      expect(
        const TelemetryConsent(diagnosticReports: ConsentChoice.granted)
            .isAnswered,
        isFalse,
      );
      expect(
        const TelemetryConsent(
          diagnosticReports: ConsentChoice.denied,
          usageEvents: ConsentChoice.denied,
        ).isAnswered,
        isTrue,
      );
    });

    test('copyWith changes one half and leaves the other alone', () {
      const consent = TelemetryConsent(
        diagnosticReports: ConsentChoice.denied,
        usageEvents: ConsentChoice.granted,
      );

      final changed = consent.copyWith(
        diagnosticReports: ConsentChoice.granted,
      );

      expect(changed.diagnosticReports, ConsentChoice.granted);
      expect(changed.usageEvents, ConsentChoice.granted);
    });

    test('compares by value, because it rides in settings', () {
      expect(
        const TelemetryConsent(usageEvents: ConsentChoice.granted),
        const TelemetryConsent(usageEvents: ConsentChoice.granted),
      );
      expect(
        const TelemetryConsent(usageEvents: ConsentChoice.granted).hashCode,
        const TelemetryConsent(usageEvents: ConsentChoice.granted).hashCode,
      );
      expect(
        const TelemetryConsent(usageEvents: ConsentChoice.granted),
        isNot(const TelemetryConsent(usageEvents: ConsentChoice.denied)),
      );
    });

    test('names both halves when printed', () {
      expect(
        const TelemetryConsent().toString(),
        contains('diagnosticReports: unasked'),
      );
    });
  });
}
