import 'dart:io';

import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/ui/features/home_screen_widget/home_screen_widget_payload.dart';
import 'package:contribkit/ui/features/home_screen_widget/home_screen_widget_service.dart';
import 'package:contribkit/ui/features/viewer/widgets/contribution_format.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../support/fixtures.dart';

const _androidRoot = 'android/app/src/main';
const _manifest = '$_androidRoot/AndroidManifest.xml';
const _kotlinRoot = '$_androidRoot/kotlin/com/fbuireu/contribkit';
const _gradle = 'android/app/build.gradle.kts';
const _strings = '$_androidRoot/res/values/strings.xml';
const _layouts = '$_androidRoot/res/layout';

const _streakViews = {
  'contribkit_widget.xml': 'widget_streak_count',
  'contribkit_widget_small.xml': 'widget_small_count',
};

const _dartKeys = <String>[
  HomeScreenWidgetKey.levels,
  HomeScreenWidgetKey.weeks,
  HomeScreenWidgetKey.colors,
  HomeScreenWidgetKey.shape,
  HomeScreenWidgetKey.username,
  HomeScreenWidgetKey.streak,
  HomeScreenWidgetKey.totalContributions,
];

String _kotlin() =>
    Directory(_kotlinRoot)
        .listSync()
        .whereType<File>()
        .where((file) => file.path.endsWith('.kt'))
        .map((file) => file.readAsStringSync())
        .join('\n');

Future<List<String>> _providersDartRefreshes() async {
  const channel = MethodChannel('home_widget');
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  final names = <String>[];

  messenger.setMockMethodCallHandler(channel, (call) async {
    if (call.method == 'updateWidget') {
      names.add((call.arguments as Map)['qualifiedAndroidName'] as String);
    }
    return true;
  });
  addTearDown(() => messenger.setMockMethodCallHandler(channel, null));

  await HomeScreenWidgetService.update(
    calendar: testCalendar(weeks: 1),
    palette: testPalette,
    cellShape: CellShape.rounded,
    today: testToday,
  );
  return names;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('the Dart to Kotlin seam is spelled twice and must agree', () {
    test('the sources this reads are where it expects them', () {
      expect(File(_manifest).existsSync(), isTrue, reason: _manifest);
      expect(Directory(_kotlinRoot).existsSync(), isTrue, reason: _kotlinRoot);
      expect(File(_gradle).existsSync(), isTrue, reason: _gradle);
      expect(_kotlin(), isNotEmpty);
    });

    test('every key Dart writes is a key Kotlin reads', () {
      final kotlin = _kotlin();
      final unread = _dartKeys
          .where((key) => !kotlin.contains('"$key"'))
          .toList();

      expect(
        unread,
        isEmpty,
        reason:
            'renaming one of these compiles, passes every test, and leaves the '
            'Home Screen Widget showing its layout defaults forever',
      );
    });

    test('every key Kotlin reads is a key Dart writes', () {
      final read = RegExp('"(widget_[a-z_]+)"')
          .allMatches(_kotlin())
          .map((match) => match.group(1)!)
          .toSet();
      final orphans = read.difference(_dartKeys.toSet());

      expect(orphans, isEmpty);
    });

    test(
      'the provider class names resolve to receivers the manifest declares',
      () async {
        final applicationId = RegExp(r'applicationId\s*=\s*"([^"]+)"')
            .firstMatch(File(_gradle).readAsStringSync())!
            .group(1)!;
        final manifest = File(_manifest).readAsStringSync();

        final declared = RegExp(r'android:name="(\.[A-Za-z]+WidgetProvider)"')
            .allMatches(manifest)
            .map((match) => '$applicationId${match.group(1)!}')
            .toSet();
        final refreshed = await _providersDartRefreshes();

        expect(declared, isNotEmpty);
        expect(refreshed, hasLength(2));
        expect(
          declared,
          containsAll(refreshed),
          reason:
              'HomeScreenWidgetService names these as plain Dart strings; a Kotlin '
              'rename is a valid refactor that leaves them dangling',
        );
      },
    );

    test('the store both sides share is named by the plugin, not by us', () {
      final kotlin = _kotlin();

      expect(
        kotlin.contains('getSharedPreferences('),
        isFalse,
        reason:
            'home_widget picks the SharedPreferences file, and its name is '
            'internal to that package. Spelling it here is a fourth string '
            'crossing this seam with nothing holding the two ends together. '
            'Read it through HomeWidgetPlugin.getData(context) instead',
      );
      expect(kotlin, contains('HomeWidgetPlugin.getData(context)'));
    });

    test('every Cell Shape is drawn by name, not by the rounded fallback', () {
      final kotlin = _kotlin();
      final unhandled = CellShape.values
          .where((shape) => shape != CellShape.rounded)
          .where((shape) => !kotlin.contains('"${shape.name}" ->'))
          .toList();

      expect(
        unhandled,
        isEmpty,
        reason:
            'the when() ends in else -> rounded, so an unhandled Cell Shape '
            'silently draws rounded rects with no compile error',
      );
    });

    test('says a Streak is unknown until a payload carries one, never a 0 '
        'nobody computed', () {
      final unknown = RegExp(
        '<string name="widget_unknown_figure">([^<]*)</string>',
      ).firstMatch(File(_strings).readAsStringSync())?.group(1);
      final defaults = {
        for (final MapEntry(key: layout, value: id) in _streakViews.entries)
          id: RegExp('android:id="@\\+id/$id"[^>]*?android:text="([^"]*)"')
              .firstMatch(File('$_layouts/$layout').readAsStringSync())
              ?.group(1),
      };
      final fallbacks = RegExp(
        r'else -> context\.getString\(R\.string\.widget_unknown_figure\)',
      ).allMatches(_kotlin()).length;

      expect(unknown, unknownTotalContributionsText);
      expect(defaults, {
        for (final id in _streakViews.values)
          id: '@string/widget_unknown_figure',
      }, reason: 'a layout default shows until the first payload lands');
      expect(
        fallbacks,
        _streakViews.length,
        reason: 'each provider reads a Streak nothing wrote as unknown',
      );
    });
  });
}
