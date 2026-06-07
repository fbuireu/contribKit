abstract interface class SuggestedUsernameRepository {
  Future<List<String>> loadAll();
}
