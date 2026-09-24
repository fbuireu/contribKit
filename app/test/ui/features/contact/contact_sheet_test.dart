import 'dart:async';

import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/value_objects/contact_outcome.dart';
import 'package:contribkit/domain/value_objects/usage_event.dart';
import 'package:contribkit/ui/failure_message.dart';
import 'package:contribkit/ui/features/contact/contact_sheet.dart';
import 'package:contribkit/ui/widgets/app_text_field.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../support/fakes.dart';
import '../../../support/harness.dart';

const _body = 'a message long enough to send';

Future<void> _openSheet(
  WidgetTester tester,
  FakeContactMessageRepository repository, {
  FakeUsageEventRepository? usageEvents,
}) => pumpSheet(
  tester,
  overrides: appOverrides(contact: repository, usageEvents: usageEvents),
  builder: (_) => const ContactSheet(),
);

Future<void> _fillIn(
  WidgetTester tester, {
  String name = 'Ada',
  String email = 'ada@example.com',
  String body = _body,
}) async {
  final fields = find.byType(AppTextField);
  await tester.enterText(fields.at(0), name);
  await tester.enterText(fields.at(1), email);
  await tester.enterText(fields.at(2), body);
  await tester.pump();
}

void main() {
  group('ContactSheet', () {
    testWidgets('says what the sheet is for and offers three fields', (
      tester,
    ) async {
      await _openSheet(tester, FakeContactMessageRepository());

      expect(find.text('Contact'), findsOneWidget);
      expect(find.byType(AppTextField), findsNWidgets(3));
      expect(find.text('Send'), findsOneWidget);
      expect(find.text('Cancel'), findsOneWidget);
    });

    testWidgets('refuses an invalid address before the repository is called', (
      tester,
    ) async {
      final repository = FakeContactMessageRepository();
      await _openSheet(tester, repository);

      await _fillIn(tester, email: 'not-an-address');
      await tester.tap(find.text('Send'));
      await tester.pumpAndSettle();

      expect(repository.delivered, isEmpty);
      expect(find.text('Send'), findsOneWidget);
    });

    testWidgets('refuses a message under the floor, for the same reason', (
      tester,
    ) async {
      final repository = FakeContactMessageRepository();
      await _openSheet(tester, repository);

      await _fillIn(tester, body: 'hi');
      await tester.tap(find.text('Send'));
      await tester.pumpAndSettle();

      expect(repository.delivered, isEmpty);
    });

    testWidgets('hands the repository a trimmed message and says it went', (
      tester,
    ) async {
      final repository = FakeContactMessageRepository();
      await _openSheet(tester, repository);

      await _fillIn(tester, name: '  Ada  ', email: '  ada@example.com  ');
      await tester.tap(find.text('Send'));
      await tester.pumpAndSettle();

      expect(repository.delivered, hasLength(1));
      expect(repository.delivered.single.name, 'Ada');
      expect(repository.delivered.single.email, 'ada@example.com');
      expect(repository.delivered.single.body, _body);
      expect(find.text('Thanks, your message is on its way.'), findsOneWidget);
      expect(find.byType(AppTextField), findsNothing);
    });

    testWidgets('renders the FailureMessage when the send is refused', (
      tester,
    ) async {
      final repository = FakeContactMessageRepository(
        failure: const DeliveryFailure(message: 'destination not verified'),
      );
      await _openSheet(tester, repository);

      await _fillIn(tester);
      await tester.tap(find.text('Send'));
      await tester.pumpAndSettle();

      expect(
        find.text(
          FailureMessage.of(const DeliveryFailure(message: 'anything')),
        ),
        findsOneWidget,
      );
      expect(find.textContaining('destination not verified'), findsNothing);
    });

    testWidgets('records the outcome of a send, and nothing typed', (
      tester,
    ) async {
      final usageEvents = FakeUsageEventRepository();
      await _openSheet(
        tester,
        FakeContactMessageRepository(),
        usageEvents: usageEvents,
      );

      await _fillIn(tester);
      await tester.tap(find.text('Send'));
      await tester.pumpAndSettle();

      expect(usageEvents.recorded, [
        UsageEvent.contactMessageSent(outcome: ContactOutcome.sent),
      ]);
      expect(
        usageEvents.recorded.single.properties.values,
        isNot(contains(_body)),
      );
    });

    testWidgets('records a refused send as failed', (tester) async {
      final usageEvents = FakeUsageEventRepository();
      await _openSheet(
        tester,
        FakeContactMessageRepository(
          failure: const DeliveryFailure(message: 'destination not verified'),
        ),
        usageEvents: usageEvents,
      );

      await _fillIn(tester);
      await tester.tap(find.text('Send'));
      await tester.pumpAndSettle();

      expect(usageEvents.recorded, [
        UsageEvent.contactMessageSent(outcome: ContactOutcome.failed),
      ]);
    });

    testWidgets('sends once however many times Send is tapped', (tester) async {
      final gate = Completer<void>();
      final repository = FakeContactMessageRepository(gate: gate.future);
      await _openSheet(tester, repository);

      await _fillIn(tester);
      await tester.tap(find.text('Send'));
      await tester.pump();

      expect(find.text('Sending…'), findsOneWidget);

      await tester.tap(find.text('Sending…'), warnIfMissed: false);
      await tester.pump();
      gate.complete();
      await tester.pumpAndSettle();

      expect(repository.delivered, hasLength(1));
    });

    testWidgets('Close after a sent message dismisses the sheet', (
      tester,
    ) async {
      await _openSheet(tester, FakeContactMessageRepository());

      await _fillIn(tester);
      await tester.tap(find.text('Send'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Close'));
      await tester.pumpAndSettle();

      expect(find.byType(ContactSheet), findsNothing);
    });

    testWidgets('Cancel closes the sheet and sends nothing', (tester) async {
      final repository = FakeContactMessageRepository();
      await _openSheet(tester, repository);

      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();

      expect(find.byType(ContactSheet), findsNothing);
      expect(repository.delivered, isEmpty);
    });
  });
}
