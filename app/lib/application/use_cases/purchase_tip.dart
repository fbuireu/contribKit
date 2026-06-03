import 'package:contribkit/domain/repositories/purchase_repository.dart';
import 'package:contribkit/domain/value_objects/tip_product.dart';

final class PurchaseTip {
  const PurchaseTip({required this._repository});

  final PurchaseRepository _repository;

  Future<void> call(TipProduct product) => _repository.purchase(product);
}
