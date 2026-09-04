import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/ui/failure_message.dart';
import 'package:flutter_test/flutter_test.dart';

final _everyFailure = <Failure>[
  const NetworkFailure(message: 'offline'),
  NotFoundFailure(username: Username('octocat')),
  const RateLimitedFailure(),
  const ParseFailure(message: 'markup changed'),
  const CacheFailure(message: 'box closed'),
  const ExportFailure(message: 'no bytes'),
  const TipFailure(message: 'declined'),
  const UnexpectedFailure(message: 'boom'),
];

void main() {
  group('FailureMessage', () {
    test('names the user a NotFoundFailure could not find', () {
      expect(
        FailureMessage.of(NotFoundFailure(username: Username('octocat'))),
        contains('octocat'),
      );
    });

    test('carries the reason for the failures that have one', () {
      expect(
        FailureMessage.of(const NetworkFailure(message: 'offline')),
        contains('offline'),
      );
      expect(
        FailureMessage.of(const ExportFailure(message: 'no bytes')),
        contains('no bytes'),
      );
      expect(
        FailureMessage.of(const TipFailure(message: 'declined')),
        contains('declined'),
      );
    });

    test('keeps the reason out of the ones that would leak internals', () {
      expect(
        FailureMessage.of(const CacheFailure(message: 'box closed')),
        isNot(contains('box closed')),
      );
      expect(
        FailureMessage.of(const ParseFailure(message: 'markup changed')),
        isNot(contains('markup changed')),
      );
      expect(
        FailureMessage.of(const UnexpectedFailure(message: 'boom')),
        isNot(contains('boom')),
      );
    });

    test('says something for every Failure kind, and never a type name', () {
      for (final failure in _everyFailure) {
        final message = FailureMessage.of(failure);

        expect(message, isNotEmpty, reason: '${failure.runtimeType}');
        expect(
          message,
          isNot(contains('Failure')),
          reason: '${failure.runtimeType} leaks its own type name',
        );
      }
    });

    test('gives every kind its own wording', () {
      final messages = _everyFailure.map(FailureMessage.of).toSet();

      expect(messages, hasLength(_everyFailure.length));
    });

    test('ofAny falls back for anything that is not a Failure', () {
      expect(
        FailureMessage.ofAny(StateError('No element')),
        FailureMessage.fallback,
      );
      expect(FailureMessage.ofAny('a bare string'), FailureMessage.fallback);
    });

    test('ofAny keeps a Failure that arrived as an Object', () {
      const Object error = ExportFailure(message: 'no bytes');

      expect(FailureMessage.ofAny(error), contains('no bytes'));
    });

    test('tells the reader when the rate limit lifts, when GitHub said', () {
      final resetAt = DateTime(2026, 8, 21, 14, 32);

      expect(
        FailureMessage.of(RateLimitedFailure(resetAt: resetAt)),
        contains('14:32'),
      );
    });

    test('still says something useful when GitHub sent no Retry-After', () {
      expect(
        FailureMessage.of(const RateLimitedFailure()),
        contains('Try again later'),
      );
    });
  });
}
