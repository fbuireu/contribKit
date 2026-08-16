import 'package:contribkit/domain/failures/failure.dart';

abstract final class FailureMessage {
  static const fallback = 'Something went wrong. Please try again.';

  static String of(Failure failure) => switch (failure) {
    NotFoundFailure(:final username) => 'User "$username" not found.',
    RateLimitedFailure() => 'GitHub rate limit exceeded. Try again later.',
    ParseFailure() =>
      'GitHub changed its contributions page. Please update the app.',
    NetworkFailure(:final message) => 'Network error: $message',
    CacheFailure() => 'Could not read saved data. Please try again.',
    ExportFailure(:final message) => 'Export failed: $message',
    PurchaseFailure(:final message) => 'Purchase failed: $message',
    UnexpectedFailure() => fallback,
  };

  static String ofAny(Object error) => error is Failure ? of(error) : fallback;
}
