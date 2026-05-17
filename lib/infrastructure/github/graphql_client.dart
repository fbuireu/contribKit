import 'dart:convert';

import 'package:http/http.dart' as http;

const _endpoint = 'https://api.github.com/graphql';

/// Minimal GraphQL client over HTTP for the GitHub API.
///
/// Reads the token from the `GITHUB_TOKEN` compile-time constant injected
/// via `--dart-define=GITHUB_TOKEN=...`. The token is never stored in source.
final class GraphQLClient {
  GraphQLClient({http.Client? httpClient})
    : _httpClient = httpClient ?? http.Client();

  static const _token = String.fromEnvironment('GITHUB_TOKEN');

  final http.Client _httpClient;

  /// Executes a GraphQL [query] with optional [variables].
  ///
  /// Throws [GitHubApiException] on non-2xx responses or GraphQL errors.
  Future<Map<String, dynamic>> query({
    required String query,
    Map<String, dynamic> variables = const {},
  }) async {
    if (_token.isEmpty) {
      throw const GitHubApiException(
        'GITHUB_TOKEN is not set. '
        'Pass it with --dart-define=GITHUB_TOKEN=<token>',
      );
    }

    final response = await _httpClient.post(
      Uri.parse(_endpoint),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'bearer $_token',
      },
      body: jsonEncode({'query': query, 'variables': variables}),
    );

    if (response.statusCode != 200) {
      throw GitHubApiException(
        'HTTP ${response.statusCode}: ${response.reasonPhrase}',
      );
    }

    final body = jsonDecode(response.body) as Map<String, dynamic>;

    if (body.containsKey('errors')) {
      final errors = body['errors'] as List<dynamic>;
      final first = errors.first as Map<String, dynamic>;
      final type = first['type'] as String?;
      final message = first['message'] as String? ?? 'Unknown GraphQL error';
      throw GitHubApiException(message, type: type);
    }

    return body['data'] as Map<String, dynamic>;
  }

  void close() => _httpClient.close();
}

/// An error returned by the GitHub GraphQL API.
final class GitHubApiException implements Exception {
  const GitHubApiException(this.message, {this.type});

  final String message;

  /// GraphQL error type (e.g. `NOT_FOUND`, `RATE_LIMITED`).
  final String? type;

  @override
  String toString() => type != null
      ? 'GitHubApiException[$type]: $message'
      : 'GitHubApiException: $message';
}
