import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:flutter/widgets.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

/// Segmented control for selecting the cell density.
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
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Cell size',
          style: TextStyle(
            fontSize: Tokens.textSm,
            color: ShadTheme.of(context).colorScheme.mutedForeground,
          ),
        ),
        const SizedBox(height: Tokens.space2),
        Row(
          children: [
            for (final size in CellSize.values) ...[
              if (size != CellSize.values.first)
                const SizedBox(width: Tokens.space2),
              ShadButton.raw(
                variant: size == selected
                    ? ShadButtonVariant.primary
                    : ShadButtonVariant.outline,
                size: ShadButtonSize.sm,
                onPressed: () => onSelected(size),
                child: Text(_labels[size]!),
              ),
            ],
          ],
        ),
      ],
    );
  }
}
