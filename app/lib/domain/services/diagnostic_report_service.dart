import 'package:contribkit/domain/failures/failure.dart';

abstract final class DiagnosticReportService {
  static bool warrants(Failure failure) => switch (failure) {
    NetworkFailure() ||
    UpstreamFailure() ||
    RateLimitedFailure() ||
    NotFoundFailure() ||
    DeliveryFailure() => false,
    ParseFailure() ||
    AssetFailure() ||
    CacheFailure() ||
    ExportFailure() ||
    TipFailure() ||
    UnexpectedFailure() => true,
  };
}
