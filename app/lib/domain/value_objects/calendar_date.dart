abstract final class CalendarDate {
  static final _isoDay = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$');

  static DateTime parse(String iso) =>
      tryParse(iso) ?? (throw FormatException('Not a calendar date', iso));

  static DateTime? tryParse(String iso) {
    final match = _isoDay.firstMatch(iso);
    if (match == null) return null;
    final month = int.parse(match[2]!);
    final day = int.parse(match[3]!);
    final date = DateTime.utc(int.parse(match[1]!), month, day);
    return date.month == month && date.day == day ? date : null;
  }

  static DateTime of(DateTime instant) =>
      DateTime.utc(instant.year, instant.month, instant.day);
}
