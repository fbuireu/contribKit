import 'package:contribkit/ui/features/contact/contact_sheet_state.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('ContactSheetState', () {
    test(
      'only the sending state is busy, which is what refuses a second tap',
      () {
        expect(const ContactSending().isSending, isTrue);
        for (final state in const <ContactSheetState>[
          ContactIdle(),
          ContactSent(),
          ContactFailed(message: 'refused'),
        ]) {
          expect(state.isSending, isFalse, reason: '$state');
        }
      },
    );

    test('only a failed state carries a message to show', () {
      expect(const ContactFailed(message: 'refused').failureMessage, 'refused');
      for (final state in const <ContactSheetState>[
        ContactIdle(),
        ContactSending(),
        ContactSent(),
      ]) {
        expect(state.failureMessage, isNull, reason: '$state');
      }
    });
  });
}
