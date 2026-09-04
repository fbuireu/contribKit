import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('every Failure names itself and carries its own detail', () {
    test('a NetworkFailure repeats the transport message', () {
      expect(
        const NetworkFailure(message: 'connection closed').toString(),
        'NetworkFailure: connection closed',
      );
    });

    test('a NotFoundFailure names the Username that was missing', () {
      expect(
        NotFoundFailure(username: Username('octocat')).toString(),
        'NotFoundFailure: user "octocat" not found',
      );
    });

    test(
      'a RateLimitedFailure carries the reset instant when GitHub sent one',
      () {
        final resetAt = DateTime.utc(2026, 3, 4, 5, 6);

        expect(
          RateLimitedFailure(resetAt: resetAt).toString(),
          'RateLimitedFailure: resets at $resetAt',
        );
        expect(
          const RateLimitedFailure().toString(),
          'RateLimitedFailure: resets at null',
        );
      },
    );

    test('a ParseFailure repeats what could not be read', () {
      expect(
        const ParseFailure(message: 'no data-level').toString(),
        'ParseFailure: no data-level',
      );
    });

    test('an AssetFailure names the bundled file', () {
      expect(
        const AssetFailure(asset: 'assets/palettes.json').toString(),
        'AssetFailure: could not read bundled asset "assets/palettes.json"',
      );
    });

    test('a CacheFailure repeats the storage message', () {
      expect(
        const CacheFailure(message: 'box is closed').toString(),
        'CacheFailure: box is closed',
      );
    });

    test('an ExportFailure repeats the render message', () {
      expect(
        const ExportFailure(message: 'no canvas').toString(),
        'ExportFailure: no canvas',
      );
    });

    test('a TipFailure repeats the store message', () {
      expect(
        const TipFailure(message: 'store unreachable').toString(),
        'TipFailure: store unreachable',
      );
    });

    test('an UnexpectedFailure repeats whatever was thrown', () {
      expect(
        const UnexpectedFailure(message: 'Bad state').toString(),
        'UnexpectedFailure: Bad state',
      );
    });
  });

  test('the set is sealed, so every Failure is one of the nine', () {
    const failures = <Failure>[
      NetworkFailure(message: 'x'),
      RateLimitedFailure(),
      ParseFailure(message: 'x'),
      AssetFailure(asset: 'x'),
      CacheFailure(message: 'x'),
      ExportFailure(message: 'x'),
      TipFailure(message: 'x'),
      UnexpectedFailure(message: 'x'),
    ];

    for (final failure in [
      ...failures,
      NotFoundFailure(username: Username('octocat')),
    ]) {
      expect(failure, isA<Exception>());
      final named = switch (failure) {
        NetworkFailure() => 'NetworkFailure',
        NotFoundFailure() => 'NotFoundFailure',
        RateLimitedFailure() => 'RateLimitedFailure',
        ParseFailure() => 'ParseFailure',
        AssetFailure() => 'AssetFailure',
        CacheFailure() => 'CacheFailure',
        ExportFailure() => 'ExportFailure',
        TipFailure() => 'TipFailure',
        UnexpectedFailure() => 'UnexpectedFailure',
      };
      expect(failure.toString(), startsWith(named));
    }
  });
}
