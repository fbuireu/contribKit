import 'package:contribkit/ui/features/customizer/widgets/setting_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

Widget _host(Widget child) => ShadApp(
  home: Material(
    child: Align(alignment: Alignment.topLeft, child: child),
  ),
);

void main() {
  group('SettingPicker', () {
    testWidgets('renders its label and one option per value', (tester) async {
      await tester.pumpWidget(
        _host(
          SettingPicker<String>(
            label: 'Cell shape',
            options: const ['Square', 'Circle', 'Hex'],
            selected: 'Square',
            onSelected: (_) {},
            optionBuilder: (option, isSelected, onTap) => SettingChoiceButton(
              label: option,
              isSelected: isSelected,
              onTap: onTap,
            ),
          ),
        ),
      );

      expect(find.text('Cell shape'), findsOneWidget);
      expect(find.text('Square'), findsOneWidget);
      expect(find.text('Circle'), findsOneWidget);
      expect(find.text('Hex'), findsOneWidget);
    });

    testWidgets('marks exactly the selected option as selected', (
      tester,
    ) async {
      final selectedFor = <String, bool>{};

      await tester.pumpWidget(
        _host(
          SettingPicker<String>(
            label: 'Cell shape',
            options: const ['Square', 'Circle'],
            selected: 'Circle',
            onSelected: (_) {},
            optionBuilder: (option, isSelected, onTap) {
              selectedFor[option] = isSelected;
              return SettingChoiceButton(
                label: option,
                isSelected: isSelected,
                onTap: onTap,
              );
            },
          ),
        ),
      );

      expect(selectedFor, {'Square': false, 'Circle': true});
    });

    testWidgets('reports the option that was tapped', (tester) async {
      String? chosen;

      await tester.pumpWidget(
        _host(
          SettingPicker<String>(
            label: 'Cell shape',
            options: const ['Square', 'Circle'],
            selected: 'Square',
            onSelected: (option) => chosen = option,
            optionBuilder: (option, isSelected, onTap) => SettingChoiceButton(
              label: option,
              isSelected: isSelected,
              onTap: onTap,
            ),
          ),
        ),
      );

      await tester.tap(find.text('Circle'));
      await tester.pump();

      expect(chosen, 'Circle');
    });

    testWidgets('wraps by default and scrolls when asked to', (tester) async {
      Widget picker({required bool scrollable}) => _host(
        SettingPicker<String>(
          label: 'Palette',
          options: const ['a', 'b'],
          selected: 'a',
          onSelected: (_) {},
          scrollable: scrollable,
          optionBuilder: (option, isSelected, onTap) =>
              SettingSwatch(isSelected: isSelected, onTap: onTap, size: 14),
        ),
      );

      await tester.pumpWidget(picker(scrollable: false));
      expect(find.byType(Wrap), findsOneWidget);
      expect(find.byType(SingleChildScrollView), findsNothing);

      await tester.pumpWidget(picker(scrollable: true));
      expect(find.byType(SingleChildScrollView), findsOneWidget);
      expect(find.byType(Wrap), findsNothing);
    });

    testWidgets('renders nothing but the label when there are no options', (
      tester,
    ) async {
      await tester.pumpWidget(
        _host(
          SettingPicker<String>(
            label: 'Palette',
            options: const [],
            selected: 'a',
            onSelected: (_) {},
            optionBuilder: (option, isSelected, onTap) =>
                SettingSwatch(isSelected: isSelected, onTap: onTap, size: 14),
          ),
        ),
      );

      expect(find.text('Palette'), findsOneWidget);
      expect(find.byType(SettingSwatch), findsNothing);
    });
  });

  group('SettingSwatch', () {
    testWidgets('reports a tap', (tester) async {
      var taps = 0;

      await tester.pumpWidget(
        _host(SettingSwatch(isSelected: false, onTap: () => taps++, size: 20)),
      );

      await tester.tap(find.byType(SettingSwatch));
      await tester.pump();

      expect(taps, 1);
    });

    testWidgets('draws a heavier border when selected', (tester) async {
      Future<double> borderWidthFor(bool isSelected) async {
        await tester.pumpWidget(
          _host(SettingSwatch(isSelected: isSelected, onTap: () {}, size: 20)),
        );
        await tester.pumpAndSettle();

        final container = tester.widget<AnimatedContainer>(
          find.byType(AnimatedContainer),
        );
        final decoration = container.decoration! as BoxDecoration;
        return decoration.border!.top.width;
      }

      final selected = await borderWidthFor(true);
      final unselected = await borderWidthFor(false);

      expect(selected, greaterThan(unselected));
    });
  });
}
