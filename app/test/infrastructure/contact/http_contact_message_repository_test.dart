import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/value_objects/contact_message.dart';
import 'package:contribkit/domain/value_objects/embed.dart';
import 'package:contribkit/infrastructure/contact/http_contact_message_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

final _message = ContactMessage(
  name: 'Ada',
  email: 'ada@example.com',
  body: 'a message long enough to send',
);

HttpContactMessageRepository _repositoryAnswering(
  Future<http.Response> Function(http.Request request) handler,
) => HttpContactMessageRepository(httpClient: MockClient(handler));

void main() {
  group('HttpContactMessageRepository', () {
    test('posts JSON to this project own contact endpoint', () async {
      late http.Request seen;
      final repository = _repositoryAnswering((request) async {
        seen = request;
        return http.Response('{"status":"accepted"}', 202);
      });

      await repository.deliver(_message);

      expect(seen.method, 'POST');
      expect(seen.url.toString(), '${Embed.origin}$contactEndpointPath');
      expect(seen.headers['Content-Type'], contains('application/json'));
      expect(jsonDecode(seen.body), {
        'name': 'Ada',
        'email': 'ada@example.com',
        'message': 'a message long enough to send',
      });
    });

    test('sends a null name rather than inventing one', () async {
      late http.Request seen;
      final repository = _repositoryAnswering((request) async {
        seen = request;
        return http.Response('', 202);
      });

      await repository.deliver(
        ContactMessage(email: 'ada@example.com', body: 'a message long enough'),
      );

      expect((jsonDecode(seen.body) as Map)['name'], isNull);
    });

    test('resolves on any 2xx, because the server answers 202', () async {
      for (final status in [200, 202, 204]) {
        final repository = _repositoryAnswering(
          (_) async => http.Response('', status),
        );

        await expectLater(repository.deliver(_message), completes);
      }
    });

    test('carries the server own sentence out of a 400', () async {
      final repository = _repositoryAnswering(
        (_) async =>
            http.Response('{"error":"Enter a valid email address"}', 400),
      );

      expect(
        () => repository.deliver(_message),
        throwsA(
          isA<DeliveryFailure>().having(
            (failure) => failure.message,
            'message',
            'Enter a valid email address',
          ),
        ),
      );
    });

    test('falls back to the status when the body names no reason', () async {
      final repository = _repositoryAnswering(
        (_) async => http.Response('<!doctype html>', 503),
      );

      expect(
        () => repository.deliver(_message),
        throwsA(
          isA<DeliveryFailure>().having(
            (failure) => failure.message,
            'message',
            'HTTP 503',
          ),
        ),
      );
    });

    test(
      'reads a 429 as a rate limit, with the reset the server named',
      () async {
        final repository = _repositoryAnswering(
          (_) async => http.Response('', 429, headers: {'retry-after': '60'}),
        );

        expect(
          () => repository.deliver(_message),
          throwsA(isA<RateLimitedFailure>()),
        );
      },
    );

    testWidgets('turns a request that never answers into a NetworkFailure', (
      tester,
    ) async {
      final repository = _repositoryAnswering(
        (_) => Completer<http.Response>().future,
      );

      final outcome = expectLater(
        repository.deliver(_message),
        throwsA(
          isA<NetworkFailure>().having(
            (failure) => failure.message,
            'message',
            contains('timed out'),
          ),
        ),
      );
      await tester.pump(const Duration(seconds: 21));

      await outcome;
    });

    test('turns a socket error into a NetworkFailure', () async {
      final repository = _repositoryAnswering((_) async {
        throw const SocketException('offline');
      });

      expect(
        () => repository.deliver(_message),
        throwsA(isA<NetworkFailure>()),
      );
    });

    test('turns a transport error into a NetworkFailure too', () async {
      final repository = _repositoryAnswering((_) async {
        throw http.ClientException('connection closed');
      });

      expect(
        () => repository.deliver(_message),
        throwsA(
          isA<NetworkFailure>().having(
            (failure) => failure.message,
            'message',
            'connection closed',
          ),
        ),
      );
    });

    test(
      'lets anything that is not a transport error through untouched',
      () async {
        final repository = _repositoryAnswering((_) async {
          throw StateError('No element');
        });

        expect(() => repository.deliver(_message), throwsStateError);
      },
    );

    test('closes only the client it owns', () {
      final injected = MockClient((_) async => http.Response('', 202));

      expect(
        HttpContactMessageRepository(httpClient: injected).close,
        returnsNormally,
      );
      expect(HttpContactMessageRepository().close, returnsNormally);
    });
  });
}
