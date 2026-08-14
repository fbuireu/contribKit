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
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class CustomizerSheet extends ConsumerStatefulWidget {
  const CustomizerSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showGeneralDialog<void>(
      context: context,
      barrierColor: AppColors.scrim,
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
  ConsumerState<CustomizerSheet> createState() => _CustomizerSheetState();
}

class _CustomizerSheetState extends ConsumerState<CustomizerSheet> {
  double _drag = 0;
  Duration _dragDuration = Duration.zero;

  void _onDragUpdate(DragUpdateDetails details) {
    setState(() {
      _dragDuration = Duration.zero;
      _drag = (_drag + details.delta.dy).clamp(0.0, double.infinity);
    });
  }

  void _onDragEnd(DragEndDetails details) {
    final velocity = details.velocity.pixelsPerSecond.dy;
    if (_drag > 120 || velocity > 700) {
      Navigator.of(context).pop();
    } else {
      setState(() {
        _dragDuration = Tokens.durationBase;
        _drag = 0;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final ViewerState state = ref.watch(viewerProvider);
    final notifier = ref.read(viewerProvider.notifier);
    final colors = AppColors.of(context);
    final maxHeight = MediaQuery.sizeOf(context).height * 0.9;

    return Align(
      alignment: Alignment.bottomCenter,
      child: AnimatedContainer(
        duration: _dragDuration,
        curve: Curves.easeOut,
        transform: Matrix4.translationValues(0, _drag, 0),
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
                  GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onVerticalDragUpdate: _onDragUpdate,
                    onVerticalDragEnd: _onDragEnd,
                    child: Container(
                      width: double.infinity,
                      alignment: Alignment.center,
                      padding: const EdgeInsets.symmetric(
                        vertical: Tokens.space3,
                      ),
                      child: Container(
                        width: Tokens.dragHandleWidth,
                        height: Tokens.dragHandleHeight,
                        decoration: BoxDecoration(
                          color: colors.border,
                          borderRadius: BorderRadius.circular(
                            Tokens.radiusFull,
                          ),
                        ),
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
                    ),
                  ),
                ],
              ),
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
    final gridBg = BackgroundPresets.colors[backgroundPreset] ?? colors.card;
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
