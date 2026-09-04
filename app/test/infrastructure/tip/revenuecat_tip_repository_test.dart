import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/value_objects/tip_outcome.dart';
import 'package:contribkit/domain/value_objects/tip_product.dart';
import 'package:contribkit/infrastructure/tip/revenuecat_tip_repository.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

const _channel = MethodChannel('purchases_flutter');

Map<String, Object?> _storeProduct({
  required String id,
  required double price,
  required String priceString,
}) => {
  'identifier': id,
  'description': 'A tip',
  'title': 'Tip $id',
  'price': price,
  'priceString': priceString,
  'currencyCode': 'USD',
};

Map<String, Object?> _package({
  required String id,
  required double price,
  required String priceString,
}) => {
  'identifier': id,
  'packageType': 'CUSTOM',
  'product': _storeProduct(id: id, price: price, priceString: priceString),
  'presentedOfferingContext': {
    'offeringIdentifier': 'tips',
    'placementIdentifier': null,
    'targetingContext': null,
  },
};

Map<String, Object?> _offerings({
  required List<Map<String, Object?>> packages,
  bool withCurrent = true,
}) {
  final offering = {
    'identifier': 'tips',
    'serverDescription': 'Tips',
    'metadata': <String, Object>{},
    'availablePackages': packages,
  };

  return {
    'all': {'tips': offering},
    if (withCurrent) 'current': offering,
  };
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;

  late List<MethodCall> calls;

  void answerWith(Future<Object?> Function(MethodCall call) handler) {
    messenger.setMockMethodCallHandler(_channel, (call) {
      calls.add(call);
      return handler(call);
    });
  }

  setUp(() => calls = []);
  tearDown(() => messenger.setMockMethodCallHandler(_channel, null));

  group('RevenueCatTipRepository.getProducts', () {
    test('offers the current offering, cheapest tier first', () async {
      answerWith(
        (_) async => _offerings(
          packages: [
            _package(id: 'tip.large', price: 10, priceString: r'$10.00'),
            _package(id: 'tip.small', price: 1, priceString: r'$1.00'),
            _package(id: 'tip.medium', price: 5, priceString: r'$5.00'),
          ],
        ),
      );

      final products = await RevenueCatTipRepository().getProducts();

      expect(products.map((product) => product.id), [
        'tip.small',
        'tip.medium',
        'tip.large',
      ]);
      expect(products.map((product) => product.priceString), [
        r'$1.00',
        r'$5.00',
        r'$10.00',
      ]);
      expect(calls.single.method, 'getOfferings');
    });

    test('a store with no current offering has nothing to offer, and is not a failure', () async {
      answerWith(
        (_) async => _offerings(packages: const [], withCurrent: false),
      );

      expect(await RevenueCatTipRepository().getProducts(), isEmpty);
    });

    test(
      'a current offering with no packages is empty rather than broken',
      () async {
        answerWith((_) async => _offerings(packages: const []));

        expect(await RevenueCatTipRepository().getProducts(), isEmpty);
      },
    );

    test('an SDK error crosses the boundary as a TipFailure', () async {
      answerWith(
        (_) async => throw PlatformException(code: '2', message: 'store down'),
      );

      expect(RevenueCatTipRepository().getProducts, throwsA(isA<TipFailure>()));
    });
  });

  group('RevenueCatTipRepository.give', () {
    const product = TipProduct(
      id: 'tip.small',
      title: 'Small tip',
      priceString: r'$1.00',
    );

    test('refuses a Tip Product the current offering does not carry', () async {
      answerWith(
        (_) async => _offerings(
          packages: [
            _package(id: 'tip.other', price: 1, priceString: r'$1.00'),
          ],
        ),
      );

      await expectLater(
        RevenueCatTipRepository().give(product),
        throwsA(
          isA<TipFailure>().having(
            (failure) => failure.message,
            'message',
            'Tip Product not found',
          ),
        ),
      );
      expect(calls.map((call) => call.method), ['getOfferings']);
    });

    test('refuses when there is no current offering at all', () async {
      answerWith(
        (_) async => _offerings(packages: const [], withCurrent: false),
      );

      await expectLater(
        RevenueCatTipRepository().give(product),
        throwsA(isA<TipFailure>()),
      );
    });

    test('a person backing out is an outcome, not a failure', () async {
      answerWith((call) async {
        if (call.method == 'getOfferings') {
          return _offerings(
            packages: [
              _package(id: 'tip.small', price: 1, priceString: r'$1.00'),
            ],
          );
        }
        throw PlatformException(code: '1', message: 'Purchase was cancelled');
      });

      expect(
        await RevenueCatTipRepository().give(product),
        TipOutcome.cancelled,
      );
      expect(calls.map((call) => call.method), [
        'getOfferings',
        'purchasePackage',
      ]);
    });

    test(
      'any other store error is a TipFailure carrying the store message',
      () async {
        answerWith((call) async {
          if (call.method == 'getOfferings') {
            return _offerings(
              packages: [
                _package(id: 'tip.small', price: 1, priceString: r'$1.00'),
              ],
            );
          }
          throw PlatformException(code: '2', message: 'card declined');
        });

        await expectLater(
          RevenueCatTipRepository().give(product),
          throwsA(
            isA<TipFailure>().having(
              (failure) => failure.message,
              'message',
              'card declined',
            ),
          ),
        );
      },
    );

    test('a store error with no message falls back to its code', () async {
      answerWith((call) async {
        if (call.method == 'getOfferings') {
          return _offerings(
            packages: [
              _package(id: 'tip.small', price: 1, priceString: r'$1.00'),
            ],
          );
        }
        throw PlatformException(code: '7');
      });

      await expectLater(
        RevenueCatTipRepository().give(product),
        throwsA(
          isA<TipFailure>().having(
            (failure) => failure.message,
            'message',
            '7',
          ),
        ),
      );
    });

    test(
      'nothing here reports entitlement, because a Tip unlocks nothing',
      () async {
        answerWith(
          (_) async => _offerings(
            packages: [
              _package(id: 'tip.small', price: 1, priceString: r'$1.00'),
            ],
          ),
        );

        await RevenueCatTipRepository().getProducts();

        expect(
          calls.map((call) => call.method),
          isNot(contains('getCustomerInfo')),
        );
        expect(
          calls.map((call) => call.method),
          isNot(contains('restorePurchases')),
        );
      },
    );
  });
}
