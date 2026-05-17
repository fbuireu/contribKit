import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';

/// Contract for fetching GitHub contribution data.
///
/// Implementations live in `infrastructure/`. Throws [Failure] subclasses on
/// error — never raw exceptions. The [fromCache] flag in the return record
/// indicates whether the data was served from the local cache.
abstract interface class ContributionRepository {
  /// Fetches the contribution calendar for [username] in [year].
  ///
  /// Throws [NotFoundFailure] if the user doesn't exist,
  /// [RateLimitedFailure] when the API limit is exceeded,
  /// and [NetworkFailure] on connectivity issues.
  Future<({ContributionCalendar calendar, bool fromCache})> fetchCalendar({
    required Username username,
    required Year year,
  });

  /// Removes all cached data for [username].
  Future<void> invalidateCache(Username username);
}
