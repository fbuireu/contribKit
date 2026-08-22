import 'package:contribkit/infrastructure/tip/store_error.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

PlatformException _withCode(String code) =>
    PlatformException(code: code, message: 'whatever');

void main() {
  group('isTipCancellation', () {
    test('recognises the code the store sends when a person backs out', () {
      final code = PurchasesErrorCode.purchaseCancelledError.index.toString();

      expect(isTipCancellation(_withCode(code)), isTrue);
    });

    test('does not treat another store error as a cancellation', () {
      final code = PurchasesErrorCode.networkError.index.toString();

      expect(isTipCancellation(_withCode(code)), isFalse);
    });

    test(
      'survives a code that is not a number, which the SDK helper throws on',
      () {
        for (final code in ['channel-error', '', 'unknown', 'NaN', '1.2.3']) {
          expect(
            () => isTipCancellation(_withCode(code)),
            returnsNormally,
            reason: code,
          );
          expect(isTipCancellation(_withCode(code)), isFalse, reason: code);
        }
      },
    );

    test('survives a negative code, which would index out of range', () {
      expect(() => isTipCancellation(_withCode('-1')), returnsNormally);
      expect(isTipCancellation(_withCode('-1')), isFalse);
    });

    test('survives a code past the end of the enum', () {
      final past = (PurchasesErrorCode.values.length + 10).toString();

      expect(() => isTipCancellation(_withCode(past)), returnsNormally);
      expect(isTipCancellation(_withCode(past)), isFalse);
    });
  });
}
