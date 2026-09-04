import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/ui/features/customizer/widgets/setting_picker.dart';
import 'package:flutter/widgets.dart';

class ShapePicker extends StatelessWidget {
  const ShapePicker({
    super.key,
    required this.selected,
    required this.onSelected,
  });

  final CellShape selected;
  final ValueChanged<CellShape> onSelected;

  @override
  Widget build(BuildContext context) => SettingPicker<CellShape>(
    label: 'Cell shape',
    options: CellShape.values,
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
