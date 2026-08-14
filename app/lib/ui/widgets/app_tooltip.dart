import 'package:flutter/widgets.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

class AppTooltip extends StatelessWidget {
  const AppTooltip({super.key, required this.message, required this.child});

  final Widget message;
  final Widget child;

  @override
  Widget build(BuildContext context) =>
      ShadTooltip(builder: (_) => message, child: child);
}
