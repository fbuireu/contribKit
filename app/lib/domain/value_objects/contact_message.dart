final class ContactMessage {
  const ContactMessage._({
    required this.name,
    required this.email,
    required this.body,
  });

  factory ContactMessage({
    String? name,
    required String email,
    required String body,
  }) {
    final trimmedName = (name ?? '').trim();
    final trimmedEmail = email.trim();
    final trimmedBody = body.trim();

    if (trimmedName.length > maxNameLength) {
      throw ArgumentError.value(
        name,
        'name',
        'must be $maxNameLength characters or fewer '
            '(got ${trimmedName.length})',
      );
    }
    if (trimmedEmail.length > maxEmailLength ||
        !_emailPattern.hasMatch(trimmedEmail)) {
      throw ArgumentError.value(email, 'email', 'must be a valid address');
    }
    if (trimmedBody.length < minBodyLength) {
      throw ArgumentError.value(
        body,
        'message',
        'must be at least $minBodyLength characters',
      );
    }
    if (trimmedBody.length > maxBodyLength) {
      throw ArgumentError.value(
        body,
        'message',
        'must be $maxBodyLength characters or fewer '
            '(got ${trimmedBody.length})',
      );
    }

    return ContactMessage._(
      name: trimmedName.isEmpty ? null : trimmedName,
      email: trimmedEmail,
      body: trimmedBody,
    );
  }

  static const maxNameLength = 80;
  static const maxEmailLength = 254;
  static const minBodyLength = 10;
  static const maxBodyLength = 4000;

  static final _emailPattern = RegExp(
    r'^[^\s<>"@]+@[^\s<>"@.]+(\.[^\s<>"@.]+)+$',
  );

  final String? name;
  final String email;
  final String body;

  @override
  bool operator ==(Object other) =>
      other is ContactMessage &&
      other.name == name &&
      other.email == email &&
      other.body == body;

  @override
  int get hashCode => Object.hash(name, email, body);

  @override
  String toString() => 'ContactMessage(${name ?? '(no name)'} <$email>)';
}
