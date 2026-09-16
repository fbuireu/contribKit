import 'package:contribkit/infrastructure/http/retry_after.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('RetryAfter.resetAtFrom', () {
    test('adds a count of seconds to now', () {
      final before = DateTime.now();

      final resetAt = RetryAfter.resetAtFrom({'retry-after': '60'});

      expect(resetAt, isNotNull);
      expect(resetAt!.difference(before).inSeconds, inInclusiveRange(59, 61));
    });

    test('reads an HTTP date, which is the other form the RFC allows', () {
      expect(
        RetryAfter.resetAtFrom({
          'retry-after': 'Wed, 21 Oct 2015 07:28:00 GMT',
        }),
        DateTime.utc(2015, 10, 21, 7, 28),
      );
    });

    test('falls back to ISO-8601, which is neither form but costs nothing', () {
      expect(
        RetryAfter.resetAtFrom({'retry-after': '2026-09-16T10:00:00Z'}),
        DateTime.utc(2026, 9, 16, 10),
      );
    });

    test(
      'answers null for a header it cannot read, never a guessed instant',
      () {
        expect(RetryAfter.resetAtFrom({'retry-after': 'soon'}), isNull);
        expect(RetryAfter.resetAtFrom({'retry-after': '   '}), isNull);
      },
    );

    test('answers null when the header is absent', () {
      expect(RetryAfter.resetAtFrom(const {}), isNull);
    });
  });
}
