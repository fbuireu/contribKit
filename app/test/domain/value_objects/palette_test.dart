import 'package:contribkit/domain/value_objects/color.dart';
import 'package:contribkit/domain/value_objects/contribution_level.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/fixtures.dart';

void main() {
  group('Palette', () {
    test('answers with the ramp entry for the level it was asked about', () {
      expect(
        ContributionLevel.values
            .map((level) => testPalette.colorFor(level))
            .toList(),
        const [
          Color(0xFF200000),
          Color(0xFF200001),
          Color(0xFF200002),
          Color(0xFF200003),
          Color(0xFF200004),
        ],
      );
    });

    test('only the empty level has a light variant, and only in the app', () {
      expect(
        testPalette.colorFor(ContributionLevel.none, isDark: false),
        const Color(0xFF2FFFFF),
      );
      for (final level in ContributionLevel.values) {
        if (level == ContributionLevel.none) continue;
        expect(
          testPalette.colorFor(level, isDark: false),
          testPalette.colorFor(level),
          reason: '$level is the same colour in either theme',
        );
      }
    });

    test('defaults to the dark ramp, which is what an Embed gets', () {
      expect(
        testPalette.colorFor(ContributionLevel.none),
        testPalette.colorFor(ContributionLevel.none, isDark: true),
      );
    });

    test('two Palettes with the same ramp are equal and hash alike', () {
      final copy = Palette(
        key: testPalette.key,
        name: testPalette.name,
        none: testPalette.none,
        noneLight: testPalette.noneLight,
        low: testPalette.low,
        medium: testPalette.medium,
        high: testPalette.high,
        veryHigh: testPalette.veryHigh,
      );

      expect(copy, testPalette);
      expect(copy.hashCode, testPalette.hashCode);
      expect({testPalette, copy}, hasLength(1));
    });

    test('a different key or a different ramp is a different Palette', () {
      expect(otherTestPalette, isNot(testPalette));
      expect(
        Palette(
          key: testPalette.key,
          name: testPalette.name,
          none: testPalette.none,
          noneLight: testPalette.noneLight,
          low: testPalette.low,
          medium: testPalette.medium,
          high: testPalette.high,
          veryHigh: const Color(0xFF000000),
        ),
        isNot(testPalette),
      );
    });

    test('prints its key, which is what a log and a stored setting share', () {
      expect(testPalette.toString(), 'Palette(nord)');
    });

    test('is not equal to something that merely looks like one', () {
      expect(testPalette, isNot('nord'));
    });
  });
}
