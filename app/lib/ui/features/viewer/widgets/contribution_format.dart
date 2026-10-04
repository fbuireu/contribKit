import 'package:intl/intl.dart';

const unknownTotalContributionsText = 'unknown';

const unknownTotalPhrase = 'contributions unknown';

String formatTotalContributions({
  required NumberFormat format,
  required int? totalContributions,
}) => totalContributions == null
    ? unknownTotalContributionsText
    : format.format(totalContributions);
