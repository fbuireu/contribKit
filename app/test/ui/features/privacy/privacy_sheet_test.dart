import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/value_objects/telemetry_consent.dart';
import 'package:contribkit/ui/features/privacy/privacy_sheet.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../support/fakes.dart';
import '../../../support/harness.dart';

Future<void> _open(
  WidgetTester tester, {
  required FakeSettingsRepository settings,
  FakeDiagnosticsRepository? diagnostics,
  FakeUsageEventRepository? usageEvents,
}) => pumpSheet(
  tester,
  overrides: appOverrides(
    settings: settings,
    diagnostics: diagnostics,
    usageEvents: usageEvents,
  ),
  builder: (_) => const PrivacySheet(),
);

void main() {
  group('PrivacySheet', () {
    testWidgets(
      'Accept all records both consents, applies them and closes the sheet',
      (tester) async {
        final settings = FakeSettingsRepository();
        final diagnostics = FakeDiagnosticsRepository();
        final usageEvents = FakeUsageEventRepository();
        await _open(
          tester,
          settings: settings,
          diagnostics: diagnostics,
          usageEvents: usageEvents,
        );

        await tester.ensureVisible(find.text('Accept all'));
        await tester.tap(find.text('Accept all'));
        await tester.pumpAndSettle();

        expect(find.byType(PrivacySheet), findsNothing);
        expect(
          settings.writes['telemetryConsent'],
          const TelemetryConsent(
            diagnosticReports: ConsentChoice.granted,
            usageEvents: ConsentChoice.granted,
          ),
        );
        expect(diagnostics.consents, [
          true,
          true,
        ], reason: 'the stored answer is applied on open, then the choice');
        expect(usageEvents.consents, [false, true]);
      },
    );

    testWidgets(
      'Reject all records both refusals, applies them and closes the sheet',
      (tester) async {
        final settings = FakeSettingsRepository();
        final diagnostics = FakeDiagnosticsRepository();
        final usageEvents = FakeUsageEventRepository();
        await _open(
          tester,
          settings: settings,
          diagnostics: diagnostics,
          usageEvents: usageEvents,
        );

        await tester.ensureVisible(find.text('Reject all'));
        await tester.tap(find.text('Reject all'));
        await tester.pumpAndSettle();

        expect(find.byType(PrivacySheet), findsNothing);
        expect(
          settings.writes['telemetryConsent'],
          const TelemetryConsent(
            diagnosticReports: ConsentChoice.denied,
            usageEvents: ConsentChoice.denied,
          ),
        );
        expect(diagnostics.consents, [true, false]);
        expect(usageEvents.consents, [false, false]);
      },
    );

    testWidgets('a single switch changes one half and keeps the sheet open', (
      tester,
    ) async {
      final settings = FakeSettingsRepository();
      final diagnostics = FakeDiagnosticsRepository();
      final usageEvents = FakeUsageEventRepository();
      await _open(
        tester,
        settings: settings,
        diagnostics: diagnostics,
        usageEvents: usageEvents,
      );

      await tester.ensureVisible(find.byType(ShadSwitch).last);
      await tester.tap(find.byType(ShadSwitch).last);
      await tester.pumpAndSettle();

      expect(find.byType(PrivacySheet), findsOneWidget);
      expect(
        settings.writes['telemetryConsent'],
        const TelemetryConsent(usageEvents: ConsentChoice.granted),
        reason: 'the Diagnostic reports half is still unasked',
      );
      expect(diagnostics.consents, [true, true]);
      expect(usageEvents.consents, [false, true]);
    });

    testWidgets('a refusal the settings box cannot store still applies', (
      tester,
    ) async {
      final settings = FakeSettingsRepository(
        writeFailure: const CacheFailure(message: 'box is gone'),
      );
      final diagnostics = FakeDiagnosticsRepository();
      final usageEvents = FakeUsageEventRepository();
      await _open(
        tester,
        settings: settings,
        diagnostics: diagnostics,
        usageEvents: usageEvents,
      );

      await tester.ensureVisible(find.text('Reject all'));
      await tester.tap(find.text('Reject all'));
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
      expect(settings.writes, isEmpty);
      expect(
        diagnostics.consents,
        [true, false],
        reason:
            'a refusal that only reaches the box leaves Sentry and PostHog on '
            'the previous answer for the rest of the session',
      );
      expect(usageEvents.consents, [false, false]);
    });
  });
}
