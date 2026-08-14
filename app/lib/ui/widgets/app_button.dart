import 'package:flutter/widgets.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

enum AppButtonSize {
  sm(ShadButtonSize.sm),
  md(ShadButtonSize.regular),
  lg(ShadButtonSize.lg);

  const AppButtonSize(this.shadSize);

  final ShadButtonSize shadSize;
}

class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.onPressed,
    required this.child,
    this.size,
    this.enabled = true,
  }) : _variant = ShadButtonVariant.primary;

  const AppButton.outline({
    super.key,
    required this.onPressed,
    required this.child,
    this.size,
    this.enabled = true,
  }) : _variant = ShadButtonVariant.outline;

  const AppButton.ghost({
    super.key,
    required this.onPressed,
    required this.child,
    this.size,
    this.enabled = true,
  }) : _variant = ShadButtonVariant.ghost;

  const AppButton.destructive({
    super.key,
    required this.onPressed,
    required this.child,
    this.size,
    this.enabled = true,
  }) : _variant = ShadButtonVariant.destructive;

  final VoidCallback? onPressed;
  final Widget child;
  final AppButtonSize? size;
  final bool enabled;
  final ShadButtonVariant _variant;

  @override
  Widget build(BuildContext context) => ShadButton.raw(
    variant: _variant,
    size: size?.shadSize,
    enabled: enabled && onPressed != null,
    onPressed: onPressed,
    child: child,
  );
}
