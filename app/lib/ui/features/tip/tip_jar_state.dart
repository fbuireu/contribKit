import 'package:contribkit/domain/value_objects/tip_product.dart';

sealed class TipPhase {
  const TipPhase();
}

final class TipIdle extends TipPhase {
  const TipIdle();
}

final class TipInFlight extends TipPhase {
  const TipInFlight(this.product);
  final TipProduct product;
}

final class TipCompleted extends TipPhase {
  const TipCompleted(this.product);
  final TipProduct product;
}

final class TipCancelled extends TipPhase {
  const TipCancelled(this.product);
  final TipProduct product;
}

final class TipFailed extends TipPhase {
  const TipFailed({required this.product, required this.message});
  final TipProduct product;
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
  const TipJarReady(this.products, {this.phase = const TipIdle()});

  final List<TipProduct> products;
  final TipPhase phase;

  static TipJarState of(List<TipProduct> products) =>
      products.isEmpty ? const TipJarUnavailable() : TipJarReady(products);

  bool get isBusy => phase is TipInFlight;

  bool get isThanking => phase is TipCompleted;

  String? get failureMessage => switch (phase) {
    TipFailed(:final message) => message,
    _ => null,
  };

  bool isInFlight(TipProduct product) => switch (phase) {
    TipInFlight(product: final p) => p.id == product.id,
    _ => false,
  };

  bool isCompleted(TipProduct product) => switch (phase) {
    TipCompleted(product: final p) => p.id == product.id,
    _ => false,
  };

  bool hasFailed(TipProduct product) => switch (phase) {
    TipFailed(product: final p) => p.id == product.id,
    _ => false,
  };

  TipJarReady? beginning(TipProduct product) =>
      isBusy ? null : TipJarReady(products, phase: TipInFlight(product));

  TipJarReady settling(TipPhase next) => TipJarReady(products, phase: next);
}
