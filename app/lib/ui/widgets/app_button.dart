import 'package:flutter/widgets.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

enum AppButtonSize {
  sm(ShadButtonSize.sm),
  md(ShadButtonSize.regular),
  lg(ShadButtonSize.lg);

  const AppButtonSize(this._shadSize);

  final ShadButtonSize _shadSize;
}

class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.onPressed,
    required this.child,
    this.size,
    this.enabled = true,
    this.semanticLabel,
  }) : _variant = ShadButtonVariant.primary;

  const AppButton.outline({
    super.key,
    required this.onPressed,
    required this.child,
    this.size,
    this.enabled = true,
    this.semanticLabel,
  }) : _variant = ShadButtonVariant.outline;

  const AppButton.ghost({
    super.key,
    required this.onPressed,
    required this.child,
    this.size,
    this.enabled = true,
    this.semanticLabel,
  }) : _variant = ShadButtonVariant.ghost;

  final VoidCallback? onPressed;
  final Widget child;
  final AppButtonSize? size;
  final bool enabled;
  final String? semanticLabel;
  final ShadButtonVariant _variant;

  String? get _announcedLabel {
    if (semanticLabel case final label?) return label;
    if (child case Text(:final data?)) return data;
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final isEnabled = enabled && onPressed != null;
    final button = ShadButton.raw(
      variant: _variant,
      size: size?._shadSize,
      enabled: isEnabled,
      onPressed: onPressed,
      child: child,
    );

    return switch (_announcedLabel) {
      final label? => Semantics(
        label: label,
        button: true,
        enabled: isEnabled,
        excludeSemantics: true,
        child: button,
      ),
      null => button,
    };
  }
}
