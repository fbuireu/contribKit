import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/contribution_stats.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/ui/theme/background_presets.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'viewer_state.freezed.dart';

@freezed
abstract class ViewerState with _$ViewerState {
  const factory ViewerState({
    @Default(null) Username? username,
    @Default(null) ContributionCalendar? calendar,
    @Default(null) ContributionStats? stats,
    @Default(false) bool fromCache,
    @Default(false) bool isLoadingCalendar,
    Year? year,
    @Default(false) bool isLoadingSettings,
    Palette? palette,
    @Default(CellShape.fallback) CellShape cellShape,
    @Default(CellSize.fallback) CellSize cellSize,
    @Default(BackgroundPreset.system) BackgroundPreset backgroundPreset,
    @Default(null) Failure? error,
    @Default(null) Failure? paletteFailure,
  }) = _ViewerState;

  const ViewerState._();

  Year get effectiveYear => year ?? Year.current;

  bool get isBusy => isLoadingSettings || isLoadingCalendar;

  Failure? get blockingFailure =>
      error ?? (palette == null ? paletteFailure : null);
}
