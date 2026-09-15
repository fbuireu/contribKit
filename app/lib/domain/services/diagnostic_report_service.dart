import 'package:contribkit/domain/failures/failure.dart';

abstract final class DiagnosticReportService {
  static bool warrants(Failure failure) => switch (failure) {
    NetworkFailure() || RateLimitedFailure() || NotFoundFailure() => false,
    ParseFailure() ||
    AssetFailure() ||
    CacheFailure() ||
    ExportFailure() ||
    TipFailure() ||
    UnexpectedFailure() => true,
  };
}
