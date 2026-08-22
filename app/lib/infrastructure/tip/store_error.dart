import 'package:flutter/services.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

bool isTipCancellation(PlatformException exception) {
  final code = int.tryParse(exception.code);
  if (code == null || code < 0) return false;
  return PurchasesErrorHelper.getErrorCode(exception) ==
      PurchasesErrorCode.purchaseCancelledError;
}
