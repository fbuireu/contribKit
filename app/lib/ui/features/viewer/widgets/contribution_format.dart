import 'package:intl/intl.dart';

const unknownTotalContributionsText = 'unknown';

const unknownCountPhrase = 'contributions unknown';

String formatTotalContributions({
  required NumberFormat format,
  required int? totalContributions,
}) => totalContributions == null
    ? unknownTotalContributionsText
    : format.format(totalContributions);
