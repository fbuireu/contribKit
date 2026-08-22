import 'package:contribkit/domain/repositories/tip_repository.dart';
import 'package:contribkit/domain/value_objects/tip_product.dart';

final class FetchTipProducts {
  const FetchTipProducts({required this._repository});

  final TipRepository _repository;

  Future<List<TipProduct>> call() => _repository.getProducts();
}
