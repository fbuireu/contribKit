import 'package:contribkit/domain/failures/failure.dart';
import 'package:intl/intl.dart';

abstract final class FailureMessage {
  static const fallback = 'Something went wrong. Please try again.';

  static final _resetTime = DateFormat('HH:mm');

  static String of(Failure failure) => switch (failure) {
    NotFoundFailure(:final username) => 'Username "$username" not found.',
    RateLimitedFailure(:final resetAt) => _rateLimited(resetAt),
    ParseFailure() =>
      'GitHub changed its contributions page. Please update the app.',
    AssetFailure() => 'ContribKit could not read its own design tokens. Reinstalling should fix it.',
    NetworkFailure() => 'Could not reach the server. Please try again.',
    CacheFailure() => 'Could not read saved data. Please try again.',
    DeliveryFailure() => 'Could not send your message. Please try again.',
    ExportFailure() => 'Export failed. Please try again.',
    TipFailure() => 'Tip failed. Please try again.',
    UnexpectedFailure() => fallback,
  };

  static String _rateLimited(DateTime? resetAt) => resetAt == null
      ? 'GitHub rate limit exceeded. Try again later.'
      : 'GitHub rate limit exceeded. Try again after '
            '${_resetTime.format(resetAt.toLocal())}.';

  static String ofAny(Object error) => error is Failure ? of(error) : fallback;
}
