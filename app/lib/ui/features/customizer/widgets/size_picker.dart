import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/ui/features/customizer/widgets/setting_picker.dart';
import 'package:flutter/widgets.dart';

class SizePicker extends StatelessWidget {
  const SizePicker({
    super.key,
    required this.selected,
    required this.onSelected,
  });

  final CellSize selected;
  final ValueChanged<CellSize> onSelected;

  @override
  Widget build(BuildContext context) => SettingPicker<CellSize>(
    label: 'Cell size',
    options: CellSize.values,
    selected: selected,
    onSelected: onSelected,
    optionBuilder: ({required option, required isSelected, required onTap}) =>
        SettingChoiceButton(
          label: option.label,
          isSelected: isSelected,
          onTap: onTap,
        ),
  );
}
