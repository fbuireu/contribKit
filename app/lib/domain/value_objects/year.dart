final class Year {
  factory Year(int value, {required DateTime today}) {
    if (value < Year.minYear || value > today.year) {
      throw RangeError.range(value, Year.minYear, today.year, 'year');
    }
    return Year._(value);
  }

  factory Year.current({required DateTime today}) =>
      Year(today.year, today: today);

  const Year._(this.value);

  static const minYear = 2005;

  final int value;

  @override
  bool operator ==(Object other) => other is Year && other.value == value;

  @override
  int get hashCode => value.hashCode;

  @override
  String toString() => value.toString();
}
