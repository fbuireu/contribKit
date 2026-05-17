/// A validated GitHub username.
///
/// GitHub usernames: 1–39 chars, alphanumeric + hyphens, cannot start or
/// end with a hyphen. Construction throws [ArgumentError] for invalid input;
/// if a [Username] instance exists, it is guaranteed to be valid.
final class Username {
  const Username._(this.value);

  factory Username(String raw) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) {
      throw ArgumentError.value(raw, 'username', 'must not be empty');
    }
    if (trimmed.length > 39) {
      throw ArgumentError.value(
        raw,
        'username',
        'must be 39 characters or fewer (got ${trimmed.length})',
      );
    }
    if (!_pattern.hasMatch(trimmed)) {
      throw ArgumentError.value(
        raw,
        'username',
        'may only contain alphanumeric characters or single hyphens, '
            'and cannot begin or end with a hyphen',
      );
    }
    return Username._(trimmed);
  }

  final String value;

  static final _pattern = RegExp(
    r'^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$',
  );

  @override
  bool operator ==(Object other) => other is Username && other.value == value;

  @override
  int get hashCode => value.hashCode;

  @override
  String toString() => value;
}
