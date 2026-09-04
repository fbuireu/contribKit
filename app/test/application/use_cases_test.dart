import 'package:contribkit/application/use_cases/export_calendar.dart';
import 'package:contribkit/application/use_cases/fetch_tip_products.dart';
import 'package:contribkit/application/use_cases/give_tip.dart';
import 'package:contribkit/application/use_cases/invalidate_contribution_cache.dart';
import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/repositories/export_repository.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/tip_outcome.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';
import '../support/fixtures.dart';

void main() {
  group('ExportCalendar', () {
    test(
      'hands the repository the calendar and the options it was given',
      () async {
        final repository = FakeExportRepository(bytes: const [7, 8, 9]);
        final calendar = testCalendar();
        const options = RenderOptions(
          palette: testPalette,
          shape: CellShape.hex,
        );

        final bytes = await ExportCalendar(repository: repository)(
          calendar: calendar,
          options: options,
        );

        expect(bytes, [7, 8, 9]);
        expect(repository.lastCalendar, same(calendar));
        expect(repository.lastOptions, same(options));
      },
    );

    test('lets an ExportFailure through rather than wrapping it', () async {
      final repository = FakeExportRepository(
        failure: const ExportFailure(message: 'no canvas'),
      );

      expect(
        () => ExportCalendar(repository: repository)(
          calendar: testCalendar(),
          options: const RenderOptions(
            palette: testPalette,
            shape: CellShape.square,
          ),
        ),
        throwsA(isA<ExportFailure>()),
      );
    });
  });

  group('FetchTipProducts', () {
    test('returns what the store offers, in the order it offers it', () async {
      final repository = FakeTipRepository();

      final products = await FetchTipProducts(repository: repository)();

      expect(products, testTipProducts);
    });

    test('lets a TipFailure through', () async {
      final repository = FakeTipRepository(
        productsFailure: const TipFailure(message: 'store unreachable'),
      );

      expect(
        FetchTipProducts(repository: repository).call,
        throwsA(isA<TipFailure>()),
      );
    });
  });

  group('GiveTip', () {
    test('passes the chosen Tip Product straight to the store', () async {
      final repository = FakeTipRepository();
      final product = testTipProducts.last;

      final outcome = await GiveTip(repository: repository)(product);

      expect(outcome, TipOutcome.completed);
      expect(repository.given, [product]);
    });

    test('reports a cancellation as an outcome, not as a failure', () async {
      final repository = FakeTipRepository(outcome: TipOutcome.cancelled);

      expect(
        await GiveTip(repository: repository)(testTipProducts.first),
        TipOutcome.cancelled,
      );
    });
  });

  group('InvalidateContributionCache', () {
    test(
      'drops the entry for exactly the Username it was asked about',
      () async {
        final repository = FakeContributionRepository();
        final username = Username('octocat');

        await InvalidateContributionCache(repository: repository)(username);

        expect(repository.invalidated, [username]);
      },
    );
  });
}
