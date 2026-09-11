import 'package:contribkit/domain/value_objects/telemetry_consent.dart';
import 'package:contribkit/ui/di/providers.dart';
import 'package:contribkit/ui/features/privacy/privacy_sheet.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../support/fakes.dart';

Future<FakeSettingsRepository> _open(WidgetTester tester) async {
  final settings = FakeSettingsRepository();
  await tester.pumpWidget(
    ProviderScope(
      overrides: [settingsRepositoryProvider.overrideWithValue(settings)],
      child: ShadApp(
        home: Builder(
          builder: (context) => GestureDetector(
            key: const Key('open'),
            behavior: HitTestBehavior.opaque,
            onTap: () => PrivacySheet.show(context),
            child: const SizedBox.expand(),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.byKey(const Key('open')));
  await tester.pumpAndSettle();
  return settings;
}

void main() {
  group('PrivacySheet', () {
    testWidgets('Accept all records both consents and closes the sheet', (
      tester,
    ) async {
      final settings = await _open(tester);

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
    });

    testWidgets('Reject all records both refusals and closes the sheet', (
      tester,
    ) async {
      final settings = await _open(tester);

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
    });

    testWidgets('a single switch changes one half and keeps the sheet open', (
      tester,
    ) async {
      final settings = await _open(tester);

      await tester.ensureVisible(find.byType(ShadSwitch).last);
      await tester.tap(find.byType(ShadSwitch).last);
      await tester.pumpAndSettle();

      expect(find.byType(PrivacySheet), findsOneWidget);
      expect(
        (settings.writes['telemetryConsent'] as TelemetryConsent).usageEvents,
        ConsentChoice.granted,
      );
    });
  });
}
