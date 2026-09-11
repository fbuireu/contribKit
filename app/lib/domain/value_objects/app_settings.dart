import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/telemetry_consent.dart';
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
    this.telemetryConsent = const TelemetryConsent(),
  });

  final Username? lastUsername;
  final Year? lastYear;
  final String? paletteKey;
  final CellShape cellShape;
  final CellSize cellSize;
  final String? backgroundPresetName;
  final AppThemeMode themeMode;
  final TelemetryConsent telemetryConsent;

  Year get year => lastYear ?? Year.current;
}
