import 'package:contribkit/domain/value_objects/contact_message.dart';
import 'package:flutter_test/flutter_test.dart';

final _body = 'a' * ContactMessage.minBodyLength;

ContactMessage _message({String? name, String? email, String? body}) =>
    ContactMessage(
      name: name,
      email: email ?? 'ada@example.com',
      body: body ?? _body,
    );

void main() {
  group('ContactMessage', () {
    test('trims every field and keeps what is left', () {
      final message = _message(
        name: '  Ada  ',
        email: '  ada@example.com ',
        body: '  $_body  ',
      );

      expect(message.name, 'Ada');
      expect(message.email, 'ada@example.com');
      expect(message.body, _body);
    });

    test('reads an absent or blank name as null, never as an empty string', () {
      expect(_message().name, isNull);
      expect(_message(name: '   ').name, isNull);
    });

    test('keeps the line breaks a message is written with', () {
      const body = 'first line\r\nsecond line\nthird';

      expect(_message(body: body).body, body);
    });

    test('refuses a name longer than the limit', () {
      expect(
        () => _message(name: 'a' * (ContactMessage.maxNameLength + 1)),
        throwsArgumentError,
      );
      expect(
        _message(name: 'a' * ContactMessage.maxNameLength).name,
        hasLength(ContactMessage.maxNameLength),
      );
    });

    test(
      'refuses an address with no dot in its domain, or more than one @',
      () {
        for (final email in [
          'ada@example',
          'ada@@example.com',
          'a@b@example.com',
          'example.com',
          'ada',
        ]) {
          expect(
            () => _message(email: email),
            throwsArgumentError,
            reason: email,
          );
        }
      },
    );

    test('refuses whitespace, angle brackets and quotes, which is the header-injection guard', () {
      for (final email in [
        'ada@example.com\r\nBcc: victim@example.com',
        'ada@example.com\nBcc: victim@example.com',
        'ada <ada@example.com>',
        '"ada"@example.com',
        'ada @example.com',
      ]) {
        expect(
          () => _message(email: email),
          throwsArgumentError,
          reason: email,
        );
      }
    });

    test('refuses an address over the length limit', () {
      expect(
        () => _message(email: '${'a' * ContactMessage.maxEmailLength}@e.com'),
        throwsArgumentError,
      );
    });

    test('accepts the ordinary shapes a real address takes', () {
      for (final email in [
        'ada+tag@example.co.uk',
        'ada.lovelace@sub.example.com',
        'a@b.co',
      ]) {
        expect(_message(email: email).email, email, reason: email);
      }
    });

    test('refuses a message under the floor or over the ceiling', () {
      expect(() => _message(body: 'hi'), throwsArgumentError);
      expect(() => _message(body: '   '), throwsArgumentError);
      expect(
        () => _message(body: 'a' * (ContactMessage.maxBodyLength + 1)),
        throwsArgumentError,
      );
      expect(
        _message(body: 'a' * ContactMessage.maxBodyLength).body,
        hasLength(ContactMessage.maxBodyLength),
      );
    });

    test('compares by value, so two identical messages are one', () {
      expect(_message(name: 'Ada'), _message(name: 'Ada'));
      expect(_message(name: 'Ada').hashCode, _message(name: 'Ada').hashCode);
      expect(_message(name: 'Ada'), isNot(_message(name: 'Grace')));
      expect(_message(), isNot(_message(email: 'grace@example.com')));
    });

    test('names itself without repeating the message body', () {
      expect(
        _message(name: 'Ada').toString(),
        'ContactMessage(Ada <ada@example.com>)',
      );
      expect(_message().toString(), contains('(no name)'));
    });
  });
}
