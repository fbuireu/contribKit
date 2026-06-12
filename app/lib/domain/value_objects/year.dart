final class Year {
  const Year._(this.value);

  static const minYear = 2005;

  factory Year(int value) {
    final maxYear = DateTime.now().year;
    if (value < Year.minYear || value > maxYear) {
      throw RangeError.range(value, Year.minYear, maxYear, 'year');
    }
    return Year._(value);
  }

  final int value;

  static Year get current => Year(DateTime.now().year);

  @override
  bool operator ==(Object other) => other is Year && other.value == value;

  @override
  int get hashCode => value.hashCode;

  @override
  String toString() => value.toString();
}
