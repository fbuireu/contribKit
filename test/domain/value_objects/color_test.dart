import 'package:contribkit/domain/value_objects/color.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Color', () {
    test('constructs from ARGB int', () {
      const color = Color(0xFF112233);
      expect(color.argb, 0xFF112233);
    });

    test('fromARGB extracts channels correctly', () {
      final color = Color.fromARGB(0xAA, 0x11, 0x22, 0x33);
      expect(color.alpha, 0xAA);
      expect(color.red, 0x11);
      expect(color.green, 0x22);
      expect(color.blue, 0x33);
    });

    test('fromRGB defaults alpha to fully opaque', () {
      final color = Color.fromRGB(0x11, 0x22, 0x33);
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

    test('toHex returns 6-digit uppercase hex', () {
      expect(Color.fromHex('#112233').toHex(), '#112233');
    });

    test('equality is by value', () {
      expect(Color.fromHex('#AABBCC'), equals(Color.fromHex('#AABBCC')));
    });

    test('unequal colors are not equal', () {
      expect(Color.fromHex('#AABBCC'), isNot(equals(Color.fromHex('#001122'))));
    });
  });
}
