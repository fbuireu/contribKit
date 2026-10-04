import 'dart:convert';
import 'dart:io';

import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/repositories/contact_message_repository.dart';
import 'package:contribkit/domain/value_objects/contact_message.dart';
import 'package:contribkit/domain/value_objects/embed.dart';
import 'package:contribkit/infrastructure/http/retry_after.dart';
import 'package:http/http.dart' as http;

const contactEndpointPath = '/api/contact';

final class HttpContactMessageRepository implements ContactMessageRepository {
  HttpContactMessageRepository({
    http.Client? httpClient,
    DateTime Function()? now,
  }) : _httpClient = httpClient ?? http.Client(),
       _ownsClient = httpClient == null,
       _now = now ?? DateTime.now;

  final http.Client _httpClient;
  final bool _ownsClient;
  final DateTime Function() _now;

  static const _timeout = Duration(seconds: 20);

  void close() {
    if (_ownsClient) _httpClient.close();
  }

  @override
  Future<void> deliver(ContactMessage message) async {
    final uri = Uri.parse('${Embed.origin}$contactEndpointPath');
    final http.Response response;
    try {
      response = await _httpClient
          .post(
            uri,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'name': message.name,
              'email': message.email,
              'message': message.body,
            }),
          )
          .timeout(
            _timeout,
            onTimeout: () => throw NetworkFailure(
              message: 'Request timed out after ${_timeout.inSeconds}s',
            ),
          );
    } on IOException catch (e) {
      throw NetworkFailure(message: e.toString());
    } on http.ClientException catch (e) {
      throw NetworkFailure(message: e.message);
    }

    if (response.statusCode == 429) {
      throw RateLimitedFailure(
        resetAt: RetryAfter.resetAtFrom(response.headers, now: _now()),
      );
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw DeliveryFailure(message: _reasonFrom(response));
    }
  }

  static String _reasonFrom(http.Response response) {
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic> && decoded['error'] is String) {
        return decoded['error'] as String;
      }
    } catch (_) {}
    return 'HTTP ${response.statusCode}';
  }
}
