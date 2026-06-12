import 'package:flutter/widgets.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

class AppBadge extends StatelessWidget {
  const AppBadge({super.key, required this.child})
    : _variant = ShadBadgeVariant.secondary;

  const AppBadge.outline({super.key, required this.child})
    : _variant = ShadBadgeVariant.outline;

  const AppBadge.primary({super.key, required this.child})
    : _variant = ShadBadgeVariant.primary;

  final Widget child;
  final ShadBadgeVariant _variant;

  @override
  Widget build(BuildContext context) =>
      ShadBadge.raw(variant: _variant, child: child);
}
