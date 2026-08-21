import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/repositories/tip_repository.dart';
import 'package:contribkit/domain/value_objects/tip_outcome.dart';
import 'package:contribkit/domain/value_objects/tip_product.dart';
import 'package:flutter/services.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

final class RevenueCatTipRepository implements TipRepository {
  @override
  Future<List<TipProduct>> getProducts() async {
    try {
      final offerings = await Purchases.getOfferings();
      final current = offerings.current;
      if (current == null) return [];

      final packages = [
        ...current.availablePackages,
      ]..sort((a, b) => (a.storeProduct.price).compareTo(b.storeProduct.price));

      return packages
          .map(
            (p) => TipProduct(
              id: p.storeProduct.identifier,
              title: p.storeProduct.title,
              priceString: p.storeProduct.priceString,
            ),
          )
          .toList();
    } on TipFailure {
      rethrow;
    } catch (e) {
      throw TipFailure(message: e.toString());
    }
  }

  @override
  Future<TipOutcome> give(TipProduct product) async {
    try {
      final offerings = await Purchases.getOfferings();
      final matches = offerings.current?.availablePackages.where(
        (p) => p.storeProduct.identifier == product.id,
      );
      if (matches == null || matches.isEmpty) {
        throw const TipFailure(message: 'Tip Product not found');
      }
      await Purchases.purchase(PurchaseParams.package(matches.first));
      return TipOutcome.completed;
    } on TipFailure {
      rethrow;
    } on PlatformException catch (e) {
      if (PurchasesErrorHelper.getErrorCode(e) ==
          PurchasesErrorCode.purchaseCancelledError) {
        return TipOutcome.cancelled;
      }
      throw TipFailure(message: e.message ?? e.code);
    } catch (e) {
      throw TipFailure(message: e.toString());
    }
  }
}
