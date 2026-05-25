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
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:contribkit/ui/widgets/app_button.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Bottom sheet exposing all customization options with a live mini preview.
///
/// Changes apply immediately to the global [viewerProvider] state so the
/// main screen updates live behind the sheet. "Apply" simply closes it.
class CustomizerSheet extends ConsumerWidget {
  const CustomizerSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showGeneralDialog<void>(
      context: context,
      barrierColor: const Color(0x80000000),
      barrierDismissible: true,
      barrierLabel: 'Dismiss',
      transitionDuration: Tokens.durationSlow,
      pageBuilder: (ctx, _, _) => const CustomizerSheet(),
      transitionBuilder: (ctx, animation, _, child) => SlideTransition(
        position: Tween<Offset>(begin: const Offset(0, 1), end: Offset.zero)
            .animate(
              CurvedAnimation(
                parent: animation,
                curve: Curves.easeOutCubic,
                reverseCurve: Curves.easeInCubic,
              ),
            ),
        child: child,
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ViewerState state = ref.watch(viewerProvider);
    final notifier = ref.read(viewerProvider.notifier);
    final colors = AppColors.of(context);
    final maxHeight = MediaQuery.sizeOf(context).height * 0.9;

    return Align(
      alignment: Alignment.bottomCenter,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: maxHeight,
          minWidth: double.infinity,
        ),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: colors.card,
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(Tokens.radiusLg),
            ),
            border: Border(top: BorderSide(color: colors.border)),
          ),
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: Tokens.space3),
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: colors.border,
                      borderRadius: BorderRadius.circular(Tokens.radiusFull),
                    ),
                  ),
                ),
                Flexible(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(
                      Tokens.space6,
                      0,
                      Tokens.space6,
                      Tokens.space8,
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'Customize',
                          style: TextStyle(
                            fontSize: Tokens.textLg,
                            fontWeight: FontWeight.w600,
                            color: colors.foreground,
                          ),
                        ),
                        const SizedBox(height: Tokens.space5),
                        if (state.calendar != null &&
                            state.palette != null) ...[
                          _CalendarPreview(
                            calendar: state.calendar!,
                            palette: state.palette!,
                            cellShape: state.cellShape,
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
                          selected: state.cardBackground,
                          onSelected: notifier.setCardBackground,
                        ),
                        const SizedBox(height: Tokens.space6),
                        AppButton(
                          onPressed: () => Navigator.of(context).pop(),
                          child: const Text('Apply'),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CalendarPreview extends StatelessWidget {
  const _CalendarPreview({
    required this.calendar,
    required this.palette,
    required this.cellShape,
  });

  final ContributionCalendar calendar;
  final Palette palette;
  final CellShape cellShape;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colors.background,
        borderRadius: BorderRadius.circular(Tokens.radiusLg),
        border: Border.all(color: colors.border),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(Tokens.radiusLg),
        child: ContributionGrid(
          calendar: calendar,
          palette: palette,
          shape: cellShape,
          cellSize: CellSize.compact,
        ),
      ),
    );
  }
}
