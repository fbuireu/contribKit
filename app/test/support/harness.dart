import 'package:contribkit/ui/di/providers.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:flutter/material.dart' show Material, ThemeMode;
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import 'fakes.dart';

Widget host({
  required Widget child,
  List<Override> overrides = const [],
  ThemeMode themeMode = ThemeMode.dark,
}) => ProviderScope(
  overrides: overrides,
  child: ShadApp(
    themeMode: themeMode,
    darkTheme: ShadThemeData(
      brightness: Brightness.dark,
      colorScheme: const ShadSlateColorScheme.dark(),
    ),
    theme: ShadThemeData(
      brightness: Brightness.light,
      colorScheme: const ShadSlateColorScheme.light(),
    ),
    home: Material(child: child),
  ),
);

Future<void> pumpHosted(
  WidgetTester tester, {
  required Widget child,
  List<Override> overrides = const [],
  ThemeMode themeMode = ThemeMode.dark,
}) async {
  await tester.pumpWidget(
    host(child: child, overrides: overrides, themeMode: themeMode),
  );
  await tester.pump();
}

Future<void> pumpSheet(
  WidgetTester tester, {
  required WidgetBuilder builder,
  List<Override> overrides = const [],
  Size surfaceSize = const Size(800, 2400),
  bool settle = true,
}) async {
  await tester.binding.setSurfaceSize(surfaceSize);
  addTearDown(() => tester.binding.setSurfaceSize(null));

  await tester.pumpWidget(
    host(
      overrides: overrides,
      child: Builder(
        builder: (context) => GestureDetector(
          key: const Key('open-sheet'),
          behavior: HitTestBehavior.opaque,
          onTap: () => showShadSheet<void>(
            context: context,
            side: ShadSheetSide.bottom,
            builder: builder,
          ),
          child: const SizedBox.expand(),
        ),
      ),
    ),
  );
  await tester.tap(find.byKey(const Key('open-sheet')));
  if (settle) {
    await tester.pumpAndSettle();
  } else {
    await tester.pump(Tokens.durationSlow);
    await tester.pump(Tokens.durationSlow);
  }
}

List<Override> appOverrides({
  FakeSettingsRepository? settings,
  FakePaletteRepository? palettes,
  FakeContributionRepository? contributions,
  FakeSuggestedUsernameRepository? usernames,
  FakeTipRepository? tips,
  FakeExportDelivery? delivery,
  FakeExportRepository? svg,
  FakeExportRepository? png,
  FakeExportRepository? markdown,
}) => [
  settingsRepositoryProvider.overrideWithValue(
    settings ?? FakeSettingsRepository(),
  ),
  paletteRepositoryProvider.overrideWithValue(
    palettes ?? FakePaletteRepository(),
  ),
  contributionRepositoryProvider.overrideWithValue(
    contributions ?? FakeContributionRepository(),
  ),
  suggestedUsernameRepositoryProvider.overrideWithValue(
    usernames ?? FakeSuggestedUsernameRepository(),
  ),
  tipRepositoryProvider.overrideWithValue(tips ?? FakeTipRepository()),
  exportDeliveryProvider.overrideWithValue(delivery ?? FakeExportDelivery()),
  svgExportRepositoryProvider.overrideWithValue(svg ?? FakeExportRepository()),
  pngExportRepositoryProvider.overrideWithValue(png ?? FakeExportRepository()),
  markdownExportRepositoryProvider.overrideWithValue(
    markdown ?? FakeExportRepository(),
  ),
];
