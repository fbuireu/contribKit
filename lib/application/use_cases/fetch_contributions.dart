import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/repositories/contribution_repository.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';

/// Fetches the contribution calendar for a user and year.
///
/// This is the primary use case for the viewer screen. Delegates to
/// [ContributionRepository] which handles caching and API calls.
final class FetchContributions {
  const FetchContributions({required ContributionRepository repository})
    : _repository = repository;

  final ContributionRepository _repository;

  /// Returns the calendar and a flag indicating whether data came from cache.
  ///
  /// Throws a [Failure] subclass on error (caught by the Riverpod provider).
  Future<({ContributionCalendar calendar, bool fromCache})> call({
    required Username username,
    required Year year,
  }) => _repository.fetchCalendar(username: username, year: year);
}
