import 'package:contribkit/domain/failures/failure.dart';

enum CalendarFailureKind {
  network,
  notFound,
  rateLimited,
  parse,
  cache,
  unexpected;

  static CalendarFailureKind of(Failure failure) => switch (failure) {
    NetworkFailure() => CalendarFailureKind.network,
    NotFoundFailure() => CalendarFailureKind.notFound,
    RateLimitedFailure() => CalendarFailureKind.rateLimited,
    ParseFailure() => CalendarFailureKind.parse,
    CacheFailure() => CalendarFailureKind.cache,
    AssetFailure() ||
    DeliveryFailure() ||
    ExportFailure() ||
    TipFailure() ||
    UnexpectedFailure() => CalendarFailureKind.unexpected,
  };
}
