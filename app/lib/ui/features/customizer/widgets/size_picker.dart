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

  static const _labels = {
    CellSize.compact: 'Compact',
    CellSize.normal: 'Normal',
    CellSize.large: 'Large',
  };

  @override
  Widget build(BuildContext context) => SettingPicker<CellSize>(
    label: 'Cell size',
    options: CellSize.values,
    selected: selected,
    onSelected: onSelected,
    optionBuilder: (size, isSelected, onTap) => SettingChoiceButton(
      label: _labels[size]!,
      isSelected: isSelected,
      onTap: onTap,
    ),
  );
}
