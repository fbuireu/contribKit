import 'package:contribkit/domain/value_objects/username.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Username', () {
    test('constructs with a valid single-character name', () {
      expect(Username('a').value, 'a');
    });

    test('trims surrounding whitespace', () {
      expect(Username('  octocat  ').value, 'octocat');
    });

    test('accepts alphanumeric names', () {
      expect(Username('user123').value, 'user123');
    });

    test('accepts names with hyphens between characters', () {
      expect(Username('my-user').value, 'my-user');
    });

    test('accepts names exactly 39 chars long', () {
      final long = 'a' * 39;
      expect(Username(long).value.length, 39);
    });

    test('throws for empty string', () {
      expect(() => Username(''), throwsA(isA<ArgumentError>()));
    });

    test('throws for whitespace-only string', () {
      expect(() => Username('   '), throwsA(isA<ArgumentError>()));
    });

    test('throws for names longer than 39 chars', () {
      expect(() => Username('a' * 40), throwsA(isA<ArgumentError>()));
    });

    test('throws when name starts with a hyphen', () {
      expect(() => Username('-invalid'), throwsA(isA<ArgumentError>()));
    });

    test('throws when name ends with a hyphen', () {
      expect(() => Username('invalid-'), throwsA(isA<ArgumentError>()));
    });

    test('throws for names with special characters', () {
      expect(() => Username('user@name'), throwsA(isA<ArgumentError>()));
    });

    test('two instances with the same value are equal', () {
      expect(Username('octocat'), equals(Username('octocat')));
    });

    test('two instances with different values are not equal', () {
      expect(Username('octocat'), isNot(equals(Username('linus'))));
    });

    test('toString returns the value', () {
      expect(Username('octocat').toString(), 'octocat');
    });
  });
}
