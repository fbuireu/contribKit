import 'package:contribkit/domain/value_objects/tip_product.dart';
import 'package:contribkit/ui/features/tip/tip_jar_state.dart';
import 'package:flutter_test/flutter_test.dart';

const _coffee = TipProduct(id: 'coffee', title: 'Coffee', priceString: '1');
const _lunch = TipProduct(id: 'lunch', title: 'Lunch', priceString: '5');

void main() {
  group('TipJarReady.of', () {
    test('names an empty store rather than showing an empty sheet', () {
      expect(TipJarReady.of(const []), isA<TipJarUnavailable>());
      expect((TipJarReady.of(const []) as TipJarUnavailable).message, isNull);
    });

    test('offers what the store returned', () {
      expect(TipJarReady.of(const [_coffee]), isA<TipJarReady>());
    });
  });

  group('a Tip in flight', () {
    test('refuses a second Tip while one is running', () {
      final ready = TipJarReady.of(const [_coffee, _lunch]) as TipJarReady;
      final giving = ready.beginning(_coffee)!;

      expect(giving.beginning(_lunch), isNull);
    });

    test('marks only the Tip Product it was started for', () {
      final ready = TipJarReady.of(const [_coffee, _lunch]) as TipJarReady;
      final giving = ready.beginning(_coffee)!;

      expect(giving.isInFlight(_coffee), isTrue);
      expect(giving.isInFlight(_lunch), isFalse);
      expect(giving.isBusy, isTrue);
    });
  });

  group('settling', () {
    late TipJarReady giving;

    setUp(() {
      giving = (TipJarReady.of(const [_coffee, _lunch]) as TipJarReady)
          .beginning(_coffee)!;
    });

    test('a completed Tip thanks the person', () {
      final settled = giving.settling(const TipCompleted(_coffee));

      expect(settled.isCompleted(_coffee), isTrue);
      expect(settled.isThanking, isTrue);
      expect(settled.failureMessage, isNull);
    });

    test('a cancelled Tip is neither a success nor a failure', () {
      final settled = giving.settling(const TipCancelled(_coffee));

      expect(settled.isCompleted(_coffee), isFalse);
      expect(settled.hasFailed(_coffee), isFalse);
      expect(settled.isThanking, isFalse);
      expect(settled.failureMessage, isNull);
      expect(settled.isBusy, isFalse);
    });

    test('a failed Tip carries its reason and thanks nobody', () {
      final settled = giving.settling(
        const TipFailed(product: _coffee, message: 'card declined'),
      );

      expect(settled.hasFailed(_coffee), isTrue);
      expect(settled.failureMessage, 'card declined');
      expect(settled.isThanking, isFalse);
    });

    test('only one Tip Product can be in a terminal state at a time', () {
      final settled = giving
          .settling(const TipCompleted(_coffee))
          .settling(const TipFailed(product: _lunch, message: 'nope'));

      expect(settled.isCompleted(_coffee), isFalse);
      expect(settled.hasFailed(_lunch), isTrue);
    });

    test('keeps the Tip Products it was built with', () {
      expect(giving.settling(const TipCancelled(_coffee)).products, const [
        _coffee,
        _lunch,
      ]);
    });
  });
}
