import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';

enum AppThemeMode { system, light, dark }

final class AppSettings {
  const AppSettings({
    this.lastUsername,
    this.lastYear,
    this.paletteKey,
    this.cellShape = CellShape.fallback,
    this.cellSize = CellSize.fallback,
    this.backgroundPresetName,
    this.themeMode = AppThemeMode.system,
  });

  final Username? lastUsername;
  final Year? lastYear;
  final String? paletteKey;
  final CellShape cellShape;
  final CellSize cellSize;
  final String? backgroundPresetName;
  final AppThemeMode themeMode;

  Year get year => lastYear ?? Year.current;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AppSettings &&
          runtimeType == other.runtimeType &&
          lastUsername == other.lastUsername &&
          lastYear == other.lastYear &&
          paletteKey == other.paletteKey &&
          cellShape == other.cellShape &&
          cellSize == other.cellSize &&
          backgroundPresetName == other.backgroundPresetName &&
          themeMode == other.themeMode;

  @override
  int get hashCode => Object.hash(
    lastUsername,
    lastYear,
    paletteKey,
    cellShape,
    cellSize,
    backgroundPresetName,
    themeMode,
  );
}
