import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('CellSize', () {
    test(
      'names every case, so a new one is a compile error and not a crash',
      () {
        for (final size in CellSize.values) {
          expect(size.label, isNotEmpty, reason: size.name);
        }
        expect(
          CellSize.values.map((size) => size.label).toSet(),
          hasLength(CellSize.values.length),
          reason: 'two Cell Sizes sharing a label would be unpickable',
        );
      },
    );

    test('grows monotonically, so a larger choice is never a smaller Cell', () {
      final ordered = [CellSize.compact, CellSize.normal, CellSize.large];

      for (var i = 1; i < ordered.length; i++) {
        expect(ordered[i].pixels, greaterThan(ordered[i - 1].pixels));
        expect(ordered[i].step, greaterThan(ordered[i - 1].step));
      }
    });

    test('step is the pitch a renderer advances by, gap included', () {
      for (final size in CellSize.values) {
        expect(size.step, size.pixels + size.gap, reason: size.name);
      }
    });

    test('falls back to normal', () {
      expect(CellSize.fallback, CellSize.normal);
    });
  });
}
