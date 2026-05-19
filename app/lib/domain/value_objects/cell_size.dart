/// The density of contribution cells in the rendered grid.
enum CellSize {
  compact,
  normal,
  large;

  /// Side length in logical pixels.
  double get pixels => switch (this) {
    CellSize.compact => 9.0,
    CellSize.normal => 11.0,
    CellSize.large => 14.0,
  };

  /// Gap between cells in logical pixels.
  double get gap => switch (this) {
    CellSize.compact => 2.0,
    CellSize.normal => 2.0,
    CellSize.large => 3.0,
  };
}
