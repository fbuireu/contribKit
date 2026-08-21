import 'package:contribkit/ui/theme/tokens.dart';
import 'package:contribkit/ui/widgets/app_sheet.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

Widget _host({required WidgetBuilder builder}) => ShadApp(
  home: Builder(
    builder: (context) => GestureDetector(
      key: const Key('open'),
      behavior: HitTestBehavior.opaque,
      onTap: () =>
          AppSheet.showBottom<void>(context: context, builder: builder),
      child: const SizedBox.expand(),
    ),
  ),
);

Future<ShadSheet> _open(WidgetTester tester) async {
  await tester.pumpWidget(
    _host(
      builder: (_) =>
          const AppSheet(title: Text('Customize'), child: Text('the contents')),
    ),
  );
  await tester.tap(find.byKey(const Key('open')));
  await tester.pumpAndSettle();

  return tester.widget<ShadSheet>(find.byType(ShadSheet));
}

void main() {
  group('AppSheet', () {
    testWidgets('renders its title and its child', (tester) async {
      await _open(tester);

      expect(find.text('Customize'), findsOneWidget);
      expect(find.text('the contents'), findsOneWidget);
    });

    testWidgets('draws a drag handle, because every sheet dismisses by drag', (
      tester,
    ) async {
      await _open(tester);

      final handles = tester
          .widgetList<SizedBox>(find.byType(SizedBox))
          .where(
            (box) =>
                box.width == Tokens.dragHandleWidth &&
                box.height == Tokens.dragHandleHeight,
          );

      expect(handles, hasLength(1));
    });

    testWidgets('is draggable, which is what the handle promises', (
      tester,
    ) async {
      expect((await _open(tester)).draggable, isTrue);
    });

    testWidgets('caps its height so it never becomes a full-screen page', (
      tester,
    ) async {
      final sheet = await _open(tester);
      final screenHeight =
          tester.view.physicalSize.height / tester.view.devicePixelRatio;

      expect(sheet.constraints?.maxHeight, isNotNull);
      expect(sheet.constraints!.maxHeight, lessThan(screenHeight));
    });

    testWidgets('keeps its rounded top even on a small screen', (tester) async {
      final sheet = await _open(tester);

      expect(sheet.removeBorderRadiusWhenTiny, isFalse);
      expect(sheet.radius, isNotNull);
    });

    testWidgets('leads its title rather than centring it', (tester) async {
      expect((await _open(tester)).titleTextAlign, TextAlign.start);
    });

    testWidgets('owns the content padding, so no sheet adds its own', (
      tester,
    ) async {
      expect((await _open(tester)).padding, isNotNull);
    });
  });
}
