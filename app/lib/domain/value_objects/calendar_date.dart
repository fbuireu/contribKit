abstract final class CalendarDate {
  static final _isoDay = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$');

  static DateTime parse(String iso) =>
      tryParse(iso) ?? (throw FormatException('Not a calendar date', iso));

  static DateTime? tryParse(String iso) {
    final match = _isoDay.firstMatch(iso);
    if (match == null) return null;
    return DateTime.utc(
      int.parse(match[1]!),
      int.parse(match[2]!),
      int.parse(match[3]!),
    );
  }

  static DateTime of(DateTime instant) =>
      DateTime.utc(instant.year, instant.month, instant.day);
}
