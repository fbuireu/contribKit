import 'package:contribkit/ui/features/customizer/widgets/setting_picker.dart';
import 'package:contribkit/ui/theme/app_colors.dart';
import 'package:contribkit/ui/theme/background_presets.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:contribkit/ui/widgets/app_tooltip.dart';
import 'package:flutter/widgets.dart';

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
    final systemColor = AppColors.of(context).card;

    return SettingPicker<BackgroundPreset>(
      label: 'Background',
      options: BackgroundPreset.values,
      selected: selected,
      onSelected: onSelected,
      optionBuilder: (preset, isSelected, onTap) => AppTooltip(
        message: Text(BackgroundPresets.labels[preset]!),
        child: SettingSwatch(
          isSelected: isSelected,
          onTap: onTap,
          color: BackgroundPresets.colors[preset] ?? systemColor,
          size: Tokens.swatchSize * 2,
          borderRadius: Tokens.radiusSm,
        ),
      ),
    );
  }
}
