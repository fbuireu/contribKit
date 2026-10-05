import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/ui/failure_message.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

final _everyFailure = <Failure>[
  const NetworkFailure(message: 'offline'),
  const UpstreamFailure(message: 'HTTP 503'),
  NotFoundFailure(username: Username('octocat')),
  const RateLimitedFailure(),
  const AssetFailure(asset: 'assets/palettes.json'),
  const ParseFailure(message: 'markup changed'),
  const CacheFailure(message: 'box closed'),
  const DeliveryFailure(message: 'destination not verified'),
  const ExportFailure(message: 'no bytes'),
  const TipFailure(message: 'declined'),
  const UnexpectedFailure(message: 'boom'),
];

void main() {
  group('FailureMessage', () {
    test('names the Username a NotFoundFailure could not find', () {
      expect(
        FailureMessage.of(NotFoundFailure(username: Username('octocat'))),
        'Username "octocat" not found.',
      );
    });

    test(
      'keeps a network error off the screen, and the Username in its URL',
      () {
        final raw = http.ClientException(
          'Connection closed before full header was received',
          Uri.parse(
            'https://github.com/users/octocat/contributions'
            '?from=2024-01-01&to=2024-12-31',
          ),
        ).toString();

        final message = FailureMessage.of(NetworkFailure(message: raw));

        expect(raw, contains('octocat'));
        expect(message, isNot(contains('octocat')));
        expect(message, isNot(contains('github.com')));
        expect(message, isNot(contains('Connection closed')));
      },
    );

    test('keeps the raw reason of every Failure off the screen', () {
      expect(
        FailureMessage.of(const NetworkFailure(message: 'offline')),
        isNot(contains('offline')),
      );
      expect(
        FailureMessage.of(const UpstreamFailure(message: 'HTTP 503')),
        isNot(contains('503')),
      );
      expect(
        FailureMessage.of(const ExportFailure(message: 'no bytes')),
        isNot(contains('no bytes')),
      );
      expect(
        FailureMessage.of(const TipFailure(message: 'declined')),
        isNot(contains('declined')),
      );
      expect(
        FailureMessage.of(const CacheFailure(message: 'box closed')),
        isNot(contains('box closed')),
      );
      expect(
        FailureMessage.of(const ParseFailure(message: 'markup changed')),
        isNot(contains('markup changed')),
      );
      expect(
        FailureMessage.of(
          const DeliveryFailure(message: 'destination not verified'),
        ),
        isNot(contains('destination not verified')),
      );
      expect(
        FailureMessage.of(const UnexpectedFailure(message: 'boom')),
        isNot(contains('boom')),
      );
      expect(
        FailureMessage.of(const AssetFailure(asset: 'assets/palettes.json')),
        isNot(contains('assets/palettes.json')),
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

    test('says GitHub answered, not that the server was unreachable', () {
      final message = FailureMessage.of(
        const UpstreamFailure(message: 'HTTP 503'),
      );

      expect(message, contains('GitHub'));
      expect(message, isNot(contains('reach')));
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

      expect(
        FailureMessage.ofAny(error),
        FailureMessage.of(const ExportFailure(message: 'no bytes')),
      );
      expect(FailureMessage.ofAny(error), isNot(FailureMessage.fallback));
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
