import 'package:contribkit/ui/theme/app_colors.dart';
import 'package:flutter/widgets.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

class AppTextField extends StatelessWidget {
  const AppTextField({
    super.key,
    this.controller,
    this.focusNode,
    this.placeholder,
    this.onSubmitted,
    this.enabled = true,
  });

  final TextEditingController? controller;
  final FocusNode? focusNode;
  final String? placeholder;
  final ValueChanged<String>? onSubmitted;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final mutedColor = AppColors.of(context).mutedForeground;
    return ShadInput(
      controller: controller,
      focusNode: focusNode,
      placeholder: switch (placeholder) {
        final text? => Text(text, style: TextStyle(color: mutedColor)),
        null => null,
      },
      onSubmitted: onSubmitted,
      enabled: enabled,
    );
  }
}
