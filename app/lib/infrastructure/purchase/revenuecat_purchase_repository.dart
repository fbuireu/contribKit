import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/repositories/purchase_repository.dart';
import 'package:contribkit/domain/value_objects/tip_product.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

final class RevenueCatPurchaseRepository implements PurchaseRepository {
  @override
  Future<List<TipProduct>> getProducts() async {
    try {
      final offerings = await Purchases.getOfferings();
      final current = offerings.current;
      if (current == null) return [];

      final packages = current.availablePackages;
      packages.sort(
        (a, b) => (a.storeProduct.price).compareTo(b.storeProduct.price),
      );

      return packages
          .map(
            (p) => TipProduct(
              id: p.storeProduct.identifier,
              title: p.storeProduct.title,
              priceString: p.storeProduct.priceString,
            ),
          )
          .toList();
    } catch (e) {
      throw PurchaseFailure(message: e.toString());
    }
  }

  @override
  Future<void> purchase(TipProduct product) async {
    try {
      final offerings = await Purchases.getOfferings();
      final package = offerings.current?.availablePackages.firstWhere(
        (p) => p.storeProduct.identifier == product.id,
      );
      if (package == null) {
        throw const PurchaseFailure(message: 'Product not found');
      }
      await Purchases.purchase(PurchaseParams.package(package));
    } on PurchasesErrorCode catch (e) {
      if (e == PurchasesErrorCode.purchaseCancelledError) return;
      throw PurchaseFailure(message: e.name);
    } catch (e) {
      throw PurchaseFailure(message: e.toString());
    }
  }
}
