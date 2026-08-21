import 'package:contribkit/domain/repositories/tip_repository.dart';
import 'package:contribkit/domain/value_objects/tip_outcome.dart';
import 'package:contribkit/domain/value_objects/tip_product.dart';

final class GiveTip {
  const GiveTip({required this._repository});

  final TipRepository _repository;

  Future<TipOutcome> call(TipProduct product) => _repository.give(product);
}
