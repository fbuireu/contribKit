import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/ui/di/providers.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

/// Palette selection strip — a row of color swatches.
///
/// The available palettes are loaded from the shared asset at runtime;
/// while loading, the strip is hidden.
class PalettePicker extends ConsumerWidget {
  const PalettePicker({
    super.key,
    required this.selected,
    required this.onSelected,
  });

  final Palette selected;
  final ValueChanged<Palette> onSelected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final palettesAsync = ref.watch(palettesProvider);

    return palettesAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
      data: (palettes) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: Tokens.space2,
        children: [
          Text(
            'Palette',
            style: TextStyle(
              fontSize: Tokens.textSm,
              color: ShadTheme.of(context).colorScheme.mutedForeground,
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              spacing: Tokens.space2,
              children: [
                for (final palette in palettes)
                  _PaletteSwatch(
                    palette: palette,
                    isSelected: palette == selected,
                    onTap: () => onSelected(palette),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PaletteSwatch extends StatelessWidget {
  const _PaletteSwatch({
    required this.palette,
    required this.isSelected,
    required this.onTap,
  });

  final Palette palette;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ShadTooltip(
      builder: (_) => Text(palette.name),
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: Tokens.durationFast,
          padding: const EdgeInsets.all(Tokens.space1),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(Tokens.radiusMd),
            border: Border.all(
              color: isSelected
                  ? ShadTheme.of(context).colorScheme.primary
                  : ShadTheme.of(context).colorScheme.border,
              width: isSelected
                  ? Tokens.swatchBorderSelected
                  : Tokens.swatchBorderDefault,
            ),
          ),
          child: Row(
            spacing: Tokens.cellGap,
            children:
                [
                      palette.none,
                      palette.low,
                      palette.medium,
                      palette.high,
                      palette.veryHigh,
                    ]
                    .map(
                      (c) => Container(
                        width: Tokens.swatchSize,
                        height: Tokens.swatchSize,
                        decoration: BoxDecoration(
                          color: Color(c.argb),
                          borderRadius: BorderRadius.circular(
                            Tokens.radiusSm * 0.5,
                          ),
                        ),
                      ),
                    )
                    .toList(),
          ),
        ),
      ),
    );
  }
}
