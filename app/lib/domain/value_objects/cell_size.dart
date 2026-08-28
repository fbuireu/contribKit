enum CellSize {
  compact,
  normal,
  large;

  static const CellSize fallback = CellSize.normal;

  double get pixels => switch (this) {
    CellSize.compact => 9.0,
    CellSize.normal => 11.0,
    CellSize.large => 14.0,
  };

  double get gap => switch (this) {
    CellSize.compact => 2.0,
    CellSize.normal => 2.0,
    CellSize.large => 3.0,
  };

  String get label => switch (this) {
    CellSize.compact => 'Compact',
    CellSize.normal => 'Normal',
    CellSize.large => 'Large',
  };

  double get step => pixels + gap;
}
