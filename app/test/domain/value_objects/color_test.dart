import 'package:contribkit/domain/value_objects/color.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Color', () {
    test('constructs from ARGB int', () {
      const color = Color(0xFF112233);
      expect(color.argb, 0xFF112233);
    });

    test('fromARGB extracts channels correctly', () {
      final color = Color.fromARGB(
        alpha: 0xAA,
        red: 0x11,
        green: 0x22,
        blue: 0x33,
      );
      expect(color.alpha, 0xAA);
      expect(color.red, 0x11);
      expect(color.green, 0x22);
      expect(color.blue, 0x33);
    });

    test('fromRGB defaults alpha to fully opaque', () {
      final color = Color.fromRGB(red: 0x11, green: 0x22, blue: 0x33);
      expect(color.alpha, 0xFF);
    });

    test('fromHex parses 6-digit hex', () {
      expect(Color.fromHex('#112233').argb, 0xFF112233);
    });

    test('fromHex parses 8-digit hex', () {
      expect(Color.fromHex('#AA112233').argb, 0xAA112233);
    });

    test('fromHex is case-insensitive', () {
      expect(Color.fromHex('#aabbcc'), equals(Color.fromHex('#AABBCC')));
    });

    test('fromHex throws for invalid length', () {
      expect(() => Color.fromHex('#123'), throwsA(isA<ArgumentError>()));
    });

    test('fromHex throws ArgumentError for the right length of the wrong characters', () {
      for (final hex in ['#ZZZZZZ', 'ZZZZZZ', '#GGHHIIJJ', '#12345 ']) {
        expect(
          () => Color.fromHex(hex),
          throwsA(isA<ArgumentError>()),
          reason: hex,
        );
      }
    });

    test('toHex returns 6-digit uppercase hex', () {
      expect(Color.fromHex('#112233').toHex(), '#112233');
    });

    test('equality is by value', () {
      expect(Color.fromHex('#AABBCC'), equals(Color.fromHex('#AABBCC')));
    });

    test('unequal colors are not equal', () {
      expect(Color.fromHex('#AABBCC'), isNot(equals(Color.fromHex('#001122'))));
    });

    test(
      'refuses an int outside the colour space, which toHex cannot render',
      () {
        expect(
          () => Color(-1),
          throwsA(isA<AssertionError>()),
          reason:
              'toHex emitted #0000-1 for it, and a negative argb compared '
              'unequal to the value that paints identically',
        );
        expect(() => Color(0x1FFFFFFFF), throwsA(isA<AssertionError>()));
        expect(const Color(0xFFFFFFFF).toHex(), '#FFFFFF');
      },
    );
  });
}
