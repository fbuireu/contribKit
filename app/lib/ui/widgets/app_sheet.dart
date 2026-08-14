import 'package:flutter/widgets.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

class AppSheet extends StatelessWidget {
  const AppSheet({
    super.key,
    required this.title,
    required this.child,
    this.description,
  });

  static Future<T?> showBottom<T>({
    required BuildContext context,
    required WidgetBuilder builder,
  }) => showShadSheet<T>(
    context: context,
    side: ShadSheetSide.bottom,
    builder: builder,
  );

  final Widget title;
  final Widget? description;
  final Widget child;

  @override
  Widget build(BuildContext context) =>
      ShadSheet(title: title, description: description, child: child);
}
