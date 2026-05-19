final class TipProduct {
  const TipProduct({
    required this.id,
    required this.title,
    required this.priceString,
  });

  final String id;
  final String title;
  final String priceString;

  @override
  bool operator ==(Object other) => other is TipProduct && other.id == id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() => 'TipProduct($id, $priceString)';
}
