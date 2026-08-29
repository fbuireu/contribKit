import 'package:contribkit/ui/theme/background_presets.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('BackgroundPreset', () {
    test('every case has a label and no two share one', () {
      final labels = BackgroundPreset.values.map((p) => p.label).toList();

      expect(labels.every((l) => l.isNotEmpty), isTrue);
      expect(labels.toSet(), hasLength(BackgroundPreset.values.length));
    });

    test('system is the only case without a colour of its own', () {
      final withoutColor = BackgroundPreset.values.where(
        (p) => p.color == null,
      );

      expect(withoutColor, [BackgroundPreset.system]);
    });

    test(
      'colorOr hands system the caller colour and everything else its own',
      () {
        const fallback = Color(0xFFABCDEF);

        expect(BackgroundPreset.system.colorOr(fallback), fallback);
        for (final preset in BackgroundPreset.values.where(
          (p) => p != BackgroundPreset.system,
        )) {
          expect(preset.colorOr(fallback), preset.flutterColor);
          expect(preset.colorOr(fallback), isNot(fallback));
        }
      },
    );

    test('byName round-trips every stored name', () {
      for (final preset in BackgroundPreset.values) {
        expect(BackgroundPreset.byName(preset.name), preset);
      }
    });

    test(
      'byName returns null for a name that is gone, rather than guessing',
      () {
        expect(BackgroundPreset.byName('midnight'), isNull);
        expect(BackgroundPreset.byName(''), isNull);
      },
    );

    test('the fallback is a real case, so a rejected name still paints', () {
      expect(BackgroundPreset.values, contains(BackgroundPreset.fallback));
    });
  });
}
