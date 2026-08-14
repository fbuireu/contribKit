enum CellShape {
  square,
  rounded,
  circle,
  dot,
  hex;

  static const CellShape fallback = CellShape.rounded;
}
