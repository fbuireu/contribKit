import 'package:contribkit/ui/theme/app_colors.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:flutter/widgets.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

class AppSheet extends StatelessWidget {
  const AppSheet({
    super.key,
    required this.title,
    required this.child,
    this.description,
  });

  static const _maxHeightRatio = 0.9;

  static const _contentPadding = EdgeInsets.fromLTRB(
    Tokens.space6,
    Tokens.space4,
    Tokens.space6,
    Tokens.space8,
  );

  static Future<T?> showBottom<T>({
    required BuildContext context,
    required WidgetBuilder builder,
  }) => showShadSheet<T>(
    context: context,
    side: ShadSheetSide.bottom,
    barrierColor: AppColors.scrim,
    animateIn: const [
      SlideEffect(
        begin: Offset(0, 1),
        end: Offset.zero,
        duration: Tokens.durationSlow,
        curve: Curves.easeOutCubic,
      ),
    ],
    animateOut: const [
      SlideEffect(
        begin: Offset.zero,
        end: Offset(0, 1),
        duration: Tokens.durationSlow,
        curve: Curves.easeInCubic,
      ),
    ],
    builder: builder,
  );

  final Widget title;
  final Widget? description;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);

    return ShadSheet(
      draggable: true,
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(context).height * _maxHeightRatio,
      ),
      radius: const BorderRadius.vertical(
        top: Radius.circular(Tokens.radiusLg),
      ),
      removeBorderRadiusWhenTiny: false,
      backgroundColor: colors.card,
      border: Border(top: BorderSide(color: colors.border)),
      shadows: const [],
      padding: _contentPadding,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      titleTextAlign: TextAlign.start,
      titleStyle: TextStyle(
        fontSize: Tokens.textLg,
        fontWeight: FontWeight.w600,
        color: colors.foreground,
      ),
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          const _DragHandle(),
          const SizedBox(height: Tokens.space3),
          title,
        ],
      ),
      description: description,
      closeIcon: const _SheetCloseButton(),
      child: child,
    );
  }
}

class _SheetCloseButton extends StatelessWidget {
  const _SheetCloseButton();

  @override
  Widget build(BuildContext context) => Semantics(
    label: 'Close',
    button: true,
    excludeSemantics: true,
    child: ShadIconButton.ghost(
      icon: const Icon(LucideIcons.x, size: Tokens.iconSm),
      width: Tokens.iconMd,
      height: Tokens.iconMd,
      padding: EdgeInsets.zero,
      onPressed: () => Navigator.of(context).pop(),
    ),
  );
}

class _DragHandle extends StatelessWidget {
  const _DragHandle();

  @override
  Widget build(BuildContext context) => Center(
    child: DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.of(context).border,
        borderRadius: BorderRadius.circular(Tokens.dragHandleHeight),
      ),
      child: const SizedBox(
        width: Tokens.dragHandleWidth,
        height: Tokens.dragHandleHeight,
      ),
    ),
  );
}
