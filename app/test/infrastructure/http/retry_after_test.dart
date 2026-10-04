import 'package:contribkit/infrastructure/http/retry_after.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final now = DateTime.utc(2031, 6, 15, 12);

  group('RetryAfter.resetAtFrom', () {
    test('adds a count of seconds to the instant its caller passes', () {
      expect(
        RetryAfter.resetAtFrom({'retry-after': '60'}, now: now),
        DateTime.utc(2031, 6, 15, 12, 1),
      );
    });

    test('reads an HTTP date, which is the other form the RFC allows', () {
      expect(
        RetryAfter.resetAtFrom({
          'retry-after': 'Wed, 21 Oct 2015 07:28:00 GMT',
        }, now: now),
        DateTime.utc(2015, 10, 21, 7, 28),
      );
    });

    test('falls back to ISO-8601, which is neither form but costs nothing', () {
      expect(
        RetryAfter.resetAtFrom({
          'retry-after': '2026-09-16T10:00:00Z',
        }, now: now),
        DateTime.utc(2026, 9, 16, 10),
      );
    });

    test(
      'answers null for a header it cannot read, never a guessed instant',
      () {
        expect(
          RetryAfter.resetAtFrom({'retry-after': 'soon'}, now: now),
          isNull,
        );
        expect(
          RetryAfter.resetAtFrom({'retry-after': '   '}, now: now),
          isNull,
        );
      },
    );

    test('answers null when the header is absent', () {
      expect(RetryAfter.resetAtFrom(const {}, now: now), isNull);
    });
  });
}
