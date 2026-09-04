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

  group('a Color prints itself the way each surface needs it', () {
    test('toHex drops the alpha, because CSS and SVG want six digits', () {
      expect(const Color(0x8039D353).toHex(), '#39D353');
    });

    test(
      'toHexARGB keeps the alpha, because the Home Screen Widget needs it',
      () {
        expect(const Color(0x8039D353).toHexARGB(), '#8039D353');
        expect(const Color(0x00000000).toHexARGB(), '#00000000');
      },
    );

    test('toString is the six-digit form, so a log reads like the token', () {
      expect(const Color(0xFF39D353).toString(), '#39D353');
    });

    test('equal Colors hash alike, so a set of them collapses', () {
      final copy = Color.fromARGB(
        alpha: 0xFF,
        red: 0x39,
        green: 0xD3,
        blue: 0x53,
      );

      expect(copy.hashCode, const Color(0xFF39D353).hashCode);
      expect({const Color(0xFF39D353), copy}, hasLength(1));
    });

    test('is not equal to something that merely looks like one', () {
      expect(const Color(0xFF39D353), isNot('#39D353'));
    });

    test('refuses an ARGB value no colour could have', () {
      expect(() => Color(-1), throwsA(isA<AssertionError>()));
      expect(() => Color(0x1FFFFFFFF), throwsA(isA<AssertionError>()));
    });
  });
}
