import 'package:contribkit/domain/repositories/purchase_repository.dart';
import 'package:contribkit/domain/value_objects/tip_product.dart';

final class FetchTipProducts {
  const FetchTipProducts({required PurchaseRepository repository})
    : _repository = repository;

  final PurchaseRepository _repository;

  Future<List<TipProduct>> call() => _repository.getProducts();
}
