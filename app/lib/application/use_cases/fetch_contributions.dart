import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/repositories/contribution_repository.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';

final class FetchContributions {
  const FetchContributions({required this._repository});

  final ContributionRepository _repository;

  Future<({ContributionCalendar calendar, bool fromCache})> call({
    required Username username,
    required Year year,
  }) => _repository.fetchCalendar(username: username, year: year);
}
