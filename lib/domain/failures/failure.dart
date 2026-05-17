/// Typed error hierarchy for the domain and application layers.
///
/// Implements [Exception] so Riverpod's [AsyncValue] captures instances
/// automatically. Infrastructure converts third-party exceptions to [Failure]
/// subclasses at the repository boundary — application code only ever sees
/// typed failures.
sealed class Failure implements Exception {
  const Failure();
}

/// A network-level error (connection timeout, DNS failure, etc.).
final class NetworkFailure extends Failure {
  const NetworkFailure({required this.message});

  final String message;

  @override
  String toString() => 'NetworkFailure: $message';
}

/// The requested GitHub user was not found.
final class NotFoundFailure extends Failure {
  const NotFoundFailure({required this.username});

  final String username;

  @override
  String toString() => 'NotFoundFailure: user "$username" not found';
}

/// The GitHub API rate limit was exceeded.
final class RateLimitedFailure extends Failure {
  const RateLimitedFailure({this.resetAt});

  final DateTime? resetAt;

  @override
  String toString() => 'RateLimitedFailure: resets at $resetAt';
}

/// A persistence / cache read or write error.
final class CacheFailure extends Failure {
  const CacheFailure({required this.message});

  final String message;

  @override
  String toString() => 'CacheFailure: $message';
}

/// A rendering or export error.
final class ExportFailure extends Failure {
  const ExportFailure({required this.message});

  final String message;

  @override
  String toString() => 'ExportFailure: $message';
}

/// Catch-all for errors that don't fit any other category.
final class UnexpectedFailure extends Failure {
  const UnexpectedFailure({required this.message});

  final String message;

  @override
  String toString() => 'UnexpectedFailure: $message';
}
