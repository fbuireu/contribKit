import 'dart:async';

import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/value_objects/tip_outcome.dart';
import 'package:contribkit/domain/value_objects/tip_product.dart';
import 'package:contribkit/ui/di/providers.dart';
import 'package:contribkit/ui/failure_message.dart';
import 'package:contribkit/ui/features/tip/tip_jar_sheet.dart';
import 'package:contribkit/ui/features/tip/tip_product_presentation.dart';
import 'package:contribkit/ui/widgets/app_icons.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../support/fakes.dart';
import '../../../support/harness.dart';

const _products = [
  TipProduct(id: 'tip.coffee', title: 'Coffee', priceString: r'$1.00'),
  TipProduct(id: 'tip.croissant', title: 'Croissant', priceString: r'$5.00'),
];

Future<void> _openJar(WidgetTester tester, FakeTipRepository repository) =>
    pumpSheet(
      tester,
      overrides: [tipRepositoryProvider.overrideWithValue(repository)],
      builder: (_) => const TipJarSheet(),
    );

void main() {
  group('TipJarSheet', () {
    testWidgets('says what a Tip is for, and that it unlocks nothing', (
      tester,
    ) async {
      await _openJar(tester, FakeTipRepository(products: _products));

      expect(find.text('Support ContribKit'), findsOneWidget);
      expect(
        find.text(
          'ContribKit is free and open-source. A small tip helps keep it alive.',
        ),
        findsOneWidget,
      );
    });

    testWidgets('offers one tier per Tip Product, with its own price', (
      tester,
    ) async {
      await _openJar(tester, FakeTipRepository(products: _products));

      for (final product in _products) {
        final look = TipProductPresentation.of(product);
        expect(find.text(look.label), findsOneWidget, reason: product.id);
        expect(find.text(look.emoji), findsOneWidget);
        expect(find.text(product.priceString), findsOneWidget);
      }
    });

    testWidgets('shows placeholders while the store is still answering', (
      tester,
    ) async {
      await pumpSheet(
        tester,
        settle: false,
        overrides: [
          tipRepositoryProvider.overrideWithValue(
            FakeTipRepository(
              products: _products,
              gate: Completer<void>().future,
            ),
          ),
        ],
        builder: (_) => const TipJarSheet(),
      );

      expect(find.text('Coffee'), findsNothing);
      expect(find.byIcon(LucideIcons.chevronRight), findsNothing);
      expect(find.text('Maybe later'), findsNothing);
    });

    testWidgets('a store with nothing to offer says so, rather than failing', (
      tester,
    ) async {
      await _openJar(tester, FakeTipRepository(products: const []));

      expect(
        find.text('No tips are available on this device right now.'),
        findsOneWidget,
      );
      expect(find.text('Retry'), findsOneWidget);
      expect(find.text('Maybe later'), findsOneWidget);
    });

    testWidgets('a store that failed says why, and offers to try again', (
      tester,
    ) async {
      const failure = TipFailure(message: 'store unreachable');

      await _openJar(tester, FakeTipRepository(productsFailure: failure));

      expect(find.text(FailureMessage.of(failure)), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('Retry asks the store again and shows what came back', (
      tester,
    ) async {
      final repository = FakeTipRepository(
        products: _products,
        failLoadsBefore: 1,
      );

      await _openJar(tester, repository);
      expect(find.text('Retry'), findsOneWidget);

      await tester.tap(find.text('Retry'));
      await tester.pumpAndSettle();

      expect(find.text('Coffee'), findsOneWidget);
      expect(repository.loads, 2);
    });

    testWidgets('a completed Tip is marked, and the sheet says thanks', (
      tester,
    ) async {
      final repository = FakeTipRepository(products: _products);

      await _openJar(tester, repository);
      await tester.tap(find.text('Coffee'));
      await tester.pumpAndSettle();

      expect(repository.given, [_products.first]);
      expect(find.byIcon(LucideIcons.check), findsOneWidget);
      expect(find.text('Thanks! ❤️'), findsOneWidget);
      expect(find.text('Maybe later'), findsNothing);
    });

    testWidgets('a cancelled Tip leaves the sheet exactly as it was', (
      tester,
    ) async {
      final repository = FakeTipRepository(
        products: _products,
        outcome: TipOutcome.cancelled,
      );

      await _openJar(tester, repository);
      await tester.tap(find.text('Coffee'));
      await tester.pumpAndSettle();

      expect(repository.given, [_products.first]);
      expect(find.byIcon(LucideIcons.check), findsNothing);
      expect(find.byIcon(LucideIcons.alertCircle), findsNothing);
      expect(find.text('Maybe later'), findsOneWidget);
    });

    testWidgets('a failed Tip marks its own tier and says what went wrong', (
      tester,
    ) async {
      const failure = TipFailure(message: 'card declined');

      await _openJar(
        tester,
        FakeTipRepository(products: _products, giveFailure: failure),
      );
      await tester.tap(find.text('Croissant'));
      await tester.pumpAndSettle();

      expect(find.byIcon(LucideIcons.alertCircle), findsOneWidget);
      expect(find.text(FailureMessage.of(failure)), findsOneWidget);
    });

    testWidgets('a Tip in flight blocks a second one, so nobody pays twice', (
      tester,
    ) async {
      final inFlight = Completer<void>();
      final repository = FakeTipRepository(
        products: _products,
        giveGate: inFlight.future,
      );

      await _openJar(tester, repository);
      await tester.tap(find.text('Coffee'));
      await tester.pump();
      await tester.tap(find.text('Croissant'));
      await tester.pump();

      expect(repository.given, [
        _products.first,
      ], reason: 'the second tap arrived while the first Tip was in flight');

      inFlight.complete();
      await tester.pumpAndSettle();
      expect(find.text('Thanks! ❤️'), findsOneWidget);
    });

    testWidgets('Maybe later closes the sheet without paying anything', (
      tester,
    ) async {
      final repository = FakeTipRepository(products: _products);

      await _openJar(tester, repository);
      await tester.tap(find.text('Maybe later'));
      await tester.pumpAndSettle();

      expect(find.byType(TipJarSheet), findsNothing);
      expect(repository.given, isEmpty);
    });
  });
}
