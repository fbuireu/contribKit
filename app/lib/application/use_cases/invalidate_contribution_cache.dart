import 'package:contribkit/domain/repositories/contribution_repository.dart';
import 'package:contribkit/domain/value_objects/username.dart';

final class InvalidateContributionCache {
  const InvalidateContributionCache({required this._repository});

  final ContributionRepository _repository;

  Future<void> call(Username username) => _repository.invalidateCache(username);
}
