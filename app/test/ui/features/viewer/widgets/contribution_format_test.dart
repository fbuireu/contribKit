import 'package:contribkit/ui/features/viewer/widgets/contribution_format.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/intl.dart';

void main() {
  final format = NumberFormat.decimalPattern('en');

  test('formats a known Total Contributions', () {
    expect(formatTotalContributions(format: format, total: 1234), '1,234');
  });

  test('formats a measured zero as a number, because zero is a fact', () {
    expect(formatTotalContributions(format: format, total: 0), '0');
  });

  test('says unknown for a Total nobody could measure', () {
    expect(
      formatTotalContributions(format: format, total: null),
      unknownTotalText,
    );
  });

  test(
    'never renders the string null, which NumberFormat would happily do',
    () {
      expect(
        formatTotalContributions(format: format, total: null),
        isNot(contains('null')),
      );
    },
  );
}
