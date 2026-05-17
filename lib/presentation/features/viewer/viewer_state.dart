import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/presentation/theme/palettes.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'viewer_state.freezed.dart';

@freezed
abstract class ViewerState with _$ViewerState {
  const factory ViewerState({
    @Default(null) Username? username,
    @Default(null) ContributionCalendar? calendar,
    @Default(false) bool fromCache,
    @Default(false) bool isExporting,
    Year? year,
    @Default(false) bool isLoadingSettings,
    Palette? palette,
    @Default(CellShape.rounded) CellShape cellShape,
  }) = _ViewerState;

  const ViewerState._();

  Palette get effectivePalette => palette ?? Palettes.github;
  Year get effectiveYear => year ?? Year.current;
}
