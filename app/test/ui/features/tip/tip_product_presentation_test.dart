import 'package:contribkit/domain/value_objects/tip_product.dart';
import 'package:contribkit/ui/features/tip/tip_product_presentation.dart';
import 'package:flutter_test/flutter_test.dart';

TipProduct _product(String id) =>
    TipProduct(id: id, title: 'Title', priceString: '€1.00');

void main() {
  group('TipProductPresentation', () {
    test('recognises a Tip Product by a fragment of its store id', () {
      expect(
        TipProductPresentation.of(_product('com.fbuireu.contribkit.coffee')),
        TipProductPresentation.byIdFragment['coffee'],
      );
      expect(
        TipProductPresentation.of(_product('contribkit_croissant_tip')),
        TipProductPresentation.byIdFragment['croissant'],
      );
    });

    test('matches regardless of the case the store reports', () {
      expect(
        TipProductPresentation.of(_product('ContribKit.LUNCH')),
        TipProductPresentation.byIdFragment['lunch'],
      );
    });

    test('falls back rather than showing nothing for an unknown id', () {
      final look = TipProductPresentation.of(_product('com.example.mystery'));

      expect(look, TipProductPresentation.fallback);
      expect(look.emoji, isNotEmpty);
      expect(look.label, isNotEmpty);
    });

    test('gives every known Tip Product its own emoji and label', () {
      final looks = TipProductPresentation.byIdFragment.values;

      expect(looks.map((look) => look.emoji).toSet(), hasLength(looks.length));
      expect(looks.map((look) => look.label).toSet(), hasLength(looks.length));
    });

    test('never returns an empty emoji or label', () {
      for (final look in [
        ...TipProductPresentation.byIdFragment.values,
        TipProductPresentation.fallback,
      ]) {
        expect(look.emoji, isNotEmpty);
        expect(look.label, isNotEmpty);
      }
    });
  });
}
