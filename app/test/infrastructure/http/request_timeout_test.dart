import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/infrastructure/http/request_timeout.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('RequestTimeout', () {
    test('lets a request run for twenty seconds', () {
      expect(RequestTimeout.duration, const Duration(seconds: 20));
    });

    test('ends an expired request as a NetworkFailure that says how long', () {
      expect(
        RequestTimeout.expired,
        throwsA(
          isA<NetworkFailure>().having(
            (failure) => failure.message,
            'message',
            'Request timed out after 20s',
          ),
        ),
      );
    });
  });
}
