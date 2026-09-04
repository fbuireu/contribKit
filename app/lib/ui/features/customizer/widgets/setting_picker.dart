import 'package:contribkit/ui/theme/app_colors.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:contribkit/ui/widgets/app_button.dart';
import 'package:flutter/widgets.dart';

typedef SettingOptionBuilder<T> = Widget Function({
  required T option,
  required bool isSelected,
  required VoidCallback onTap,
});

class SettingPicker<T> extends StatelessWidget {
  const SettingPicker({
    super.key,
    required this.label,
    required this.options,
    required this.selected,
    required this.onSelected,
    required this.optionBuilder,
    this.scrollable = false,
  });

  final String label;
  final List<T> options;
  final T selected;
  final ValueChanged<T> onSelected;
  final SettingOptionBuilder<T> optionBuilder;
  final bool scrollable;

  @override
  Widget build(BuildContext context) {
    final items = [
      for (final option in options)
        optionBuilder(
          option: option,
          isSelected: option == selected,
          onTap: () => onSelected(option),
        ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      spacing: Tokens.space2,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: Tokens.textSm,
            color: AppColors.of(context).mutedForeground,
          ),
        ),
        if (scrollable)
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(spacing: Tokens.space2, children: items),
          )
        else
          Wrap(
            spacing: Tokens.space2,
            runSpacing: Tokens.space2,
            children: items,
          ),
      ],
    );
  }
}

class SettingChoiceButton extends StatelessWidget {
  const SettingChoiceButton({
    super.key,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => isSelected
      ? AppButton(size: AppButtonSize.sm, onPressed: onTap, child: Text(label))
      : AppButton.outline(
          size: AppButtonSize.sm,
          onPressed: onTap,
          child: Text(label),
        );
}

class SettingSwatch extends StatelessWidget {
  const SettingSwatch({
    super.key,
    required this.isSelected,
    required this.onTap,
    this.child,
    this.color,
    this.padding,
    this.size,
    this.borderRadius,
  });

  final bool isSelected;
  final VoidCallback onTap;
  final Widget? child;
  final Color? color;
  final EdgeInsetsGeometry? padding;
  final double? size;
  final double? borderRadius;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: Tokens.durationFast,
        width: size,
        height: size,
        padding: padding,
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(borderRadius ?? Tokens.radiusMd),
          border: Border.all(
            color: isSelected ? colors.accent : colors.border,
            width: isSelected
                ? Tokens.swatchBorderSelected
                : Tokens.swatchBorderDefault,
          ),
        ),
        child: child,
      ),
    );
  }
}
