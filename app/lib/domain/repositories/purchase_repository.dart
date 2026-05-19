import 'package:contribkit/domain/value_objects/tip_product.dart';

abstract interface class PurchaseRepository {
  Future<List<TipProduct>> getProducts();
  Future<void> purchase(TipProduct product);
}
