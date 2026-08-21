enum CellShape {
  square,
  rounded,
  circle,
  dot,
  hex;

  static const CellShape fallback = CellShape.rounded;

  String get label => switch (this) {
    CellShape.square => 'Square',
    CellShape.rounded => 'Rounded',
    CellShape.circle => 'Circle',
    CellShape.dot => 'Dot',
    CellShape.hex => 'Hex',
  };
}
