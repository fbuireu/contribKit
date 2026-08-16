import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/ui/di/providers.dart';
import 'package:contribkit/ui/features/customizer/widgets/setting_picker.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:contribkit/ui/widgets/app_tooltip.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

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
    return ref
        .watch(palettesProvider)
        .when(
          loading: () => const SizedBox.shrink(),
          error: (_, _) => const SizedBox.shrink(),
          data: (palettes) => SettingPicker<Palette>(
            label: 'Palette',
            options: palettes,
            selected: selected,
            onSelected: onSelected,
            scrollable: true,
            optionBuilder: (palette, isSelected, onTap) => AppTooltip(
              message: Text(palette.name),
              child: SettingSwatch(
                isSelected: isSelected,
                onTap: onTap,
                padding: const EdgeInsets.all(Tokens.space1),
                child: _PaletteRamp(palette: palette),
              ),
            ),
          ),
        );
  }
}

class _PaletteRamp extends StatelessWidget {
  const _PaletteRamp({required this.palette});

  final Palette palette;

  @override
  Widget build(BuildContext context) => Row(
    spacing: Tokens.swatchGap,
    children: [
      for (final color in [
        palette.none,
        palette.low,
        palette.medium,
        palette.high,
        palette.veryHigh,
      ])
        Container(
          width: Tokens.swatchSize,
          height: Tokens.swatchSize,
          decoration: BoxDecoration(
            color: Color(color.argb),
            borderRadius: BorderRadius.circular(Tokens.swatchRampRadius),
          ),
        ),
    ],
  );
}
