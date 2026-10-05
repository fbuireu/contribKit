import 'package:contribkit/ui/features/export/export_sheet_state.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('ExportSheetState', () {
    test('only an Export in flight is busy, which refuses a second tap', () {
      expect(const ExportInFlight().isExporting, isTrue);
      for (final state in const <ExportSheetState>[
        ExportIdle(),
        ExportCopied(),
        ExportFailed(message: 'no canvas'),
      ]) {
        expect(state.isExporting, isFalse, reason: '$state');
      }
    });

    test('only a copy that went through says Copied', () {
      expect(const ExportCopied().isCopied, isTrue);
      for (final state in const <ExportSheetState>[
        ExportIdle(),
        ExportInFlight(),
        ExportFailed(message: 'no canvas'),
      ]) {
        expect(state.isCopied, isFalse, reason: '$state');
      }
    });

    test('only a failed Export carries a message to show', () {
      expect(
        const ExportFailed(message: 'no canvas').failureMessage,
        'no canvas',
      );
      for (final state in const <ExportSheetState>[
        ExportIdle(),
        ExportInFlight(),
        ExportCopied(),
      ]) {
        expect(state.failureMessage, isNull, reason: '$state');
      }
    });

    test('beginning an Export leaves the Copied and the error behind', () {
      for (final state in const <ExportSheetState>[
        ExportIdle(),
        ExportCopied(),
        ExportFailed(message: 'no canvas'),
      ]) {
        final next = state.beginning();

        expect(next, isA<ExportInFlight>(), reason: '$state');
        expect(next!.isCopied, isFalse, reason: '$state');
        expect(next.failureMessage, isNull, reason: '$state');
      }
    });

    test('an Export in flight cannot begin another', () {
      expect(const ExportInFlight().beginning(), isNull);
    });
  });
}
