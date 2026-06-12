import 'package:flutter/widgets.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

class AppTextField extends StatelessWidget {
  const AppTextField({
    super.key,
    this.controller,
    this.focusNode,
    this.placeholder,
    this.onSubmitted,
    this.onChanged,
    this.autofocus = false,
    this.enabled = true,
  });

  final TextEditingController? controller;
  final FocusNode? focusNode;
  final String? placeholder;
  final ValueChanged<String>? onSubmitted;
  final ValueChanged<String>? onChanged;
  final bool autofocus;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final mutedColor = ShadTheme.of(context).colorScheme.mutedForeground;
    return ShadInput(
      controller: controller,
      focusNode: focusNode,
      placeholder: placeholder != null
          ? Text(placeholder!, style: TextStyle(color: mutedColor))
          : null,
      onSubmitted: onSubmitted,
      onChanged: onChanged,
      autofocus: autofocus,
      enabled: enabled,
    );
  }
}
