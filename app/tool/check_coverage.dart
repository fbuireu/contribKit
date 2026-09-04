import 'dart:io';

const minThreshold = 85;

const _report = 'coverage/lcov.info';

typedef _Tally = ({int hit, int found});

_Tally _tallyOf(String lcov) {
  var hit = 0;
  var found = 0;

  for (final line in lcov.split('\n')) {
    if (!line.startsWith('DA:')) continue;
    final parts = line.substring(3).trim().split(',');
    if (parts.length < 2) continue;
    final count = int.tryParse(parts[1]);
    if (count == null) continue;
    found++;
    if (count > 0) hit++;
  }

  return (hit: hit, found: found);
}

void main() {
  final file = File(_report);
  if (!file.existsSync()) {
    stderr.writeln(
      'No $_report. Run "flutter test --coverage" before this check.',
    );
    exit(1);
  }

  final tally = _tallyOf(file.readAsStringSync());
  if (tally.found == 0) {
    stderr.writeln('$_report records no lines, so it measures nothing.');
    exit(1);
  }

  final percent = 100 * tally.hit / tally.found;
  final rounded = percent.toStringAsFixed(2);

  if (percent + 0.005 < minThreshold) {
    stderr.writeln(
      'Coverage $rounded% (${tally.hit}/${tally.found}) is below the '
      '$minThreshold% floor.',
    );
    exit(1);
  }

  stdout.writeln('Coverage $rounded% (${tally.hit}/${tally.found}).');
}
