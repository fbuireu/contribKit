import 'dart:io';

abstract final class RetryAfter {
  static DateTime? resetAtFrom(Map<String, String> headers) {
    final header = headers['retry-after'];
    if (header == null) return null;
    final trimmed = header.trim();
    final seconds = int.tryParse(trimmed);
    if (seconds != null) return DateTime.now().add(Duration(seconds: seconds));
    try {
      return HttpDate.parse(trimmed);
    } catch (_) {
      return DateTime.tryParse(trimmed);
    }
  }
}
