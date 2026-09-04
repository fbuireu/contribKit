import 'package:contribkit/domain/value_objects/tip_product.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('TipProduct', () {
    test(
      'is the store identifier, so a re-priced tier is still the same tier',
      () {
        const before = TipProduct(
          id: 'tip.small',
          title: 'Small tip',
          priceString: r'$1.00',
        );
        const after = TipProduct(
          id: 'tip.small',
          title: 'Pequena propina',
          priceString: '1,09 EUR',
        );

        expect(after, before);
        expect(after.hashCode, before.hashCode);
      },
    );

    test('two tiers with different identifiers are different products', () {
      const small = TipProduct(
        id: 'tip.small',
        title: 'Small tip',
        priceString: r'$1.00',
      );
      const large = TipProduct(
        id: 'tip.large',
        title: 'Small tip',
        priceString: r'$1.00',
      );

      expect(large, isNot(small));
    });

    test('prints the identifier and the price, which is what a log needs', () {
      expect(
        const TipProduct(
          id: 'tip.medium',
          title: 'Medium tip',
          priceString: r'$5.00',
        ).toString(),
        r'TipProduct(tip.medium, $5.00)',
      );
    });

    test('is not equal to something that merely looks like one', () {
      expect(
        const TipProduct(id: 'a', title: 'a', priceString: 'a'),
        isNot('a'),
      );
    });
  });
}
