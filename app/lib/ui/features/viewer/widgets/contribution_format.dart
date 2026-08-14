import 'package:intl/intl.dart';

const unknownTotalText = 'unknown';

const unknownTotalPhrase = 'contributions unknown';

String formatTotalContributions({
  required NumberFormat format,
  required int? total,
}) => total == null ? unknownTotalText : format.format(total);
