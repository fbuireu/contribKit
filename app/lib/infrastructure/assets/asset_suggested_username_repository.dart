import 'dart:convert';

import 'package:contribkit/domain/repositories/suggested_username_repository.dart';
import 'package:flutter/services.dart';

final class AssetSuggestedUsernameRepository
    implements SuggestedUsernameRepository {
  static const _assetKey = 'assets/usernames.json';

  @override
  Future<List<String>> loadAll() async {
    final raw = await rootBundle.loadString(_assetKey);
    final data = jsonDecode(raw) as List<dynamic>;
    return data.cast<String>();
  }
}
