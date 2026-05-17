/// A validated calendar year for contribution queries.
///
/// Valid range: 2005 (GitHub's founding year) through the current year.
/// Construction throws [RangeError] for out-of-range values.
final class Year {
  const Year._(this.value);

  /// The earliest year for which GitHub tracks contributions.
  static const minYear = 2005;

  factory Year(int value) {
    final maxYear = DateTime.now().year;
    if (value < Year.minYear || value > maxYear) {
      throw RangeError.range(value, Year.minYear, maxYear, 'year');
    }
    return Year._(value);
  }

  final int value;

  /// The current calendar year.
  static Year get current => Year(DateTime.now().year);

  @override
  bool operator ==(Object other) => other is Year && other.value == value;

  @override
  int get hashCode => value.hashCode;

  @override
  String toString() => value.toString();
}
