import 'package:contribkit/ui/theme/app_colors.dart';
import 'package:contribkit/ui/theme/background_presets.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:flutter/widgets.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

/// A row of color swatches for selecting the calendar card background.
class BackgroundPicker extends StatelessWidget {
  const BackgroundPicker({
    super.key,
    required this.selected,
    required this.onSelected,
  });

  final BackgroundPreset selected;
  final ValueChanged<BackgroundPreset> onSelected;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Background',
          style: TextStyle(
            fontSize: Tokens.textSm,
            color: ShadTheme.of(context).colorScheme.mutedForeground,
          ),
        ),
        const SizedBox(height: Tokens.space2),
        Row(
          children: [
            for (final preset in BackgroundPreset.values) ...[
              if (preset != BackgroundPreset.values.first)
                const SizedBox(width: Tokens.space2),
              _BackgroundSwatch(
                preset: preset,
                isSelected: preset == selected,
                systemColor: colors.card,
                onTap: () => onSelected(preset),
              ),
            ],
          ],
        ),
      ],
    );
  }
}

class _BackgroundSwatch extends StatelessWidget {
  const _BackgroundSwatch({
    required this.preset,
    required this.isSelected,
    required this.systemColor,
    required this.onTap,
  });

  final BackgroundPreset preset;
  final bool isSelected;
  final Color systemColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final swatchColor = BackgroundPresets.colors[preset] ?? systemColor;
    final label = BackgroundPresets.labels[preset]!;

    return ShadTooltip(
      builder: (_) => Text(label),
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: Tokens.durationFast,
          width: Tokens.swatchSize * 2,
          height: Tokens.swatchSize * 2,
          decoration: BoxDecoration(
            color: swatchColor,
            borderRadius: BorderRadius.circular(Tokens.radiusSm),
            border: Border.all(
              color: isSelected
                  ? ShadTheme.of(context).colorScheme.primary
                  : ShadTheme.of(context).colorScheme.border,
              width: isSelected
                  ? Tokens.swatchBorderSelected
                  : Tokens.swatchBorderDefault,
            ),
          ),
        ),
      ),
    );
  }
}
