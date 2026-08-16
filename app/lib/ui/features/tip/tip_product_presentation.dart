import 'package:contribkit/domain/value_objects/tip_product.dart';

typedef TipProductLook = ({String emoji, String label});

abstract final class TipProductPresentation {
  static const fallback = (emoji: '🎁', label: 'Tip');

  static const byIdFragment = <String, TipProductLook>{
    'coffee': (emoji: '☕', label: 'Coffee'),
    'croissant': (emoji: '🥐', label: 'Croissant'),
    'lunch': (emoji: '🍱', label: 'Lunch'),
  };

  static TipProductLook of(TipProduct product) {
    final id = product.id.toLowerCase();
    for (final entry in byIdFragment.entries) {
      if (id.contains(entry.key)) return entry.value;
    }
    return fallback;
  }
}
