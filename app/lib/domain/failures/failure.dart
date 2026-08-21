sealed class Failure implements Exception {
  const Failure();
}

final class NetworkFailure extends Failure {
  const NetworkFailure({required this.message});
  final String message;

  @override
  String toString() => 'NetworkFailure: $message';
}

final class NotFoundFailure extends Failure {
  const NotFoundFailure({required this.username});
  final String username;

  @override
  String toString() => 'NotFoundFailure: user "$username" not found';
}

final class RateLimitedFailure extends Failure {
  const RateLimitedFailure({this.resetAt});
  final DateTime? resetAt;

  @override
  String toString() => 'RateLimitedFailure: resets at $resetAt';
}

final class ParseFailure extends Failure {
  const ParseFailure({required this.message});
  final String message;

  @override
  String toString() => 'ParseFailure: $message';
}

final class CacheFailure extends Failure {
  const CacheFailure({required this.message});
  final String message;

  @override
  String toString() => 'CacheFailure: $message';
}

final class ExportFailure extends Failure {
  const ExportFailure({required this.message});
  final String message;

  @override
  String toString() => 'ExportFailure: $message';
}

final class TipFailure extends Failure {
  const TipFailure({required this.message});
  final String message;

  @override
  String toString() => 'TipFailure: $message';
}

final class UnexpectedFailure extends Failure {
  const UnexpectedFailure({required this.message});
  final String message;

  @override
  String toString() => 'UnexpectedFailure: $message';
}
