import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:flutter/widgets.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

/// Segmented control for selecting the cell shape.
class ShapePicker extends StatelessWidget {
  const ShapePicker({
    super.key,
    required this.selected,
    required this.onSelected,
  });

  final CellShape selected;
  final ValueChanged<CellShape> onSelected;

  static const _labels = {
    CellShape.square: 'Square',
    CellShape.rounded: 'Rounded',
    CellShape.circle: 'Circle',
    CellShape.dot: 'Dot',
    CellShape.hex: 'Hex',
  };

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      spacing: Tokens.space2,
      children: [
        Text(
          'Cell shape',
          style: TextStyle(
            fontSize: Tokens.textSm,
            color: ShadTheme.of(context).colorScheme.mutedForeground,
          ),
        ),
        Wrap(
          spacing: Tokens.space2,
          runSpacing: Tokens.space2,
          children: [
            for (final shape in CellShape.values)
              _ShapeButton(
                label: _labels[shape]!,
                isSelected: shape == selected,
                onTap: () => onSelected(shape),
              ),
          ],
        ),
      ],
    );
  }
}

class _ShapeButton extends StatelessWidget {
  const _ShapeButton({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => ShadButton.raw(
    variant: isSelected ? ShadButtonVariant.primary : ShadButtonVariant.outline,
    size: ShadButtonSize.sm,
    onPressed: onTap,
    child: Text(label),
  );
}
