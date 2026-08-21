import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/ui/features/customizer/widgets/background_picker.dart';
import 'package:contribkit/ui/features/customizer/widgets/palette_picker.dart';
import 'package:contribkit/ui/features/customizer/widgets/shape_picker.dart';
import 'package:contribkit/ui/features/customizer/widgets/size_picker.dart';
import 'package:contribkit/ui/features/viewer/viewer_notifier.dart';
import 'package:contribkit/ui/features/viewer/viewer_state.dart';
import 'package:contribkit/ui/features/viewer/widgets/contribution_grid.dart';
import 'package:contribkit/ui/theme/app_colors.dart';
import 'package:contribkit/ui/theme/background_presets.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:contribkit/ui/widgets/app_button.dart';
import 'package:contribkit/ui/widgets/app_sheet.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class CustomizerSheet extends ConsumerWidget {
  const CustomizerSheet({super.key});

  static Future<void> show(BuildContext context) => AppSheet.showBottom<void>(
    context: context,
    builder: (_) => const CustomizerSheet(),
  );

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ViewerState state = ref.watch(viewerProvider);
    final notifier = ref.read(viewerProvider.notifier);

    return AppSheet(
      title: const Text('Customize'),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (state.calendar != null && state.palette != null) ...[
            _CalendarPreview(
              calendar: state.calendar!,
              palette: state.palette!,
              cellShape: state.cellShape,
              cellSize: state.cellSize,
              backgroundPreset: state.backgroundPreset,
            ),
            const SizedBox(height: Tokens.space5),
          ],
          if (state.palette != null) ...[
            PalettePicker(
              selected: state.palette!,
              onSelected: notifier.setPalette,
            ),
            const SizedBox(height: Tokens.space5),
          ],
          ShapePicker(
            selected: state.cellShape,
            onSelected: notifier.setCellShape,
          ),
          const SizedBox(height: Tokens.space5),
          SizePicker(
            selected: state.cellSize,
            onSelected: notifier.setCellSize,
          ),
          const SizedBox(height: Tokens.space5),
          BackgroundPicker(
            selected: state.backgroundPreset,
            onSelected: notifier.setBackgroundPreset,
          ),
          const SizedBox(height: Tokens.space6),
          AppButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Apply'),
          ),
        ],
      ),
    );
  }
}

class _CalendarPreview extends StatelessWidget {
  const _CalendarPreview({
    required this.calendar,
    required this.palette,
    required this.cellShape,
    required this.cellSize,
    required this.backgroundPreset,
  });

  final ContributionCalendar calendar;
  final Palette palette;
  final CellShape cellShape;
  final CellSize cellSize;
  final BackgroundPreset backgroundPreset;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final gridBg = backgroundPreset.colorOr(colors.card);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: gridBg,
        borderRadius: BorderRadius.circular(Tokens.radiusLg),
        border: Border.all(color: colors.border),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(Tokens.radiusLg),
        child: ContributionGrid(
          calendar: calendar,
          palette: palette,
          shape: cellShape,
          cellSize: cellSize,
        ),
      ),
    );
  }
}
