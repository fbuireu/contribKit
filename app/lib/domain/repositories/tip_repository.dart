import 'package:contribkit/domain/value_objects/tip_outcome.dart';
import 'package:contribkit/domain/value_objects/tip_product.dart';

abstract interface class TipRepository {
  Future<List<TipProduct>> getTipProducts();
  Future<TipOutcome> give(TipProduct tipProduct);
}
