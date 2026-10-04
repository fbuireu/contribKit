import 'package:contribkit/domain/value_objects/tip_product.dart';

sealed class TipPhase {
  const TipPhase();
}

final class TipIdle extends TipPhase {
  const TipIdle();
}

final class TipInFlight extends TipPhase {
  const TipInFlight(this.tipProduct);
  final TipProduct tipProduct;
}

final class TipCompleted extends TipPhase {
  const TipCompleted(this.tipProduct);
  final TipProduct tipProduct;
}

final class TipCancelled extends TipPhase {
  const TipCancelled(this.tipProduct);
  final TipProduct tipProduct;
}

final class TipFailed extends TipPhase {
  const TipFailed({required this.tipProduct, required this.message});
  final TipProduct tipProduct;
  final String message;
}

sealed class TipJarState {
  const TipJarState();
}

final class TipJarLoading extends TipJarState {
  const TipJarLoading();
}

final class TipJarUnavailable extends TipJarState {
  const TipJarUnavailable({this.message});
  final String? message;
}

final class TipJarReady extends TipJarState {
  const TipJarReady(this.tipProducts, {this.phase = const TipIdle()});

  final List<TipProduct> tipProducts;
  final TipPhase phase;

  static TipJarState of(List<TipProduct> tipProducts) => tipProducts.isEmpty
      ? const TipJarUnavailable()
      : TipJarReady(tipProducts);

  bool get isBusy => phase is TipInFlight;

  bool get isThanking => phase is TipCompleted;

  String? get failureMessage => switch (phase) {
    TipFailed(:final message) => message,
    _ => null,
  };

  bool isInFlight(TipProduct tipProduct) => switch (phase) {
    TipInFlight(tipProduct: final p) => p.id == tipProduct.id,
    _ => false,
  };

  bool isCompleted(TipProduct tipProduct) => switch (phase) {
    TipCompleted(tipProduct: final p) => p.id == tipProduct.id,
    _ => false,
  };

  bool hasFailed(TipProduct tipProduct) => switch (phase) {
    TipFailed(tipProduct: final p) => p.id == tipProduct.id,
    _ => false,
  };

  TipJarReady? beginning(TipProduct tipProduct) =>
      isBusy ? null : TipJarReady(tipProducts, phase: TipInFlight(tipProduct));

  TipJarReady settling(TipPhase next) => TipJarReady(tipProducts, phase: next);
}
