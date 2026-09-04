import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/ui/features/widget/calendar_widget_service.dart';
import 'package:contribkit/ui/features/widget/home_screen_widget_payload.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../support/fixtures.dart';

const _channel = MethodChannel('home_widget');

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;

  late List<MethodCall> calls;
  late bool refuse;

  setUp(() {
    calls = [];
    refuse = false;
    messenger.setMockMethodCallHandler(_channel, (call) async {
      calls.add(call);
      if (refuse) throw PlatformException(code: 'no-widget');
      return true;
    });
  });

  tearDown(() => messenger.setMockMethodCallHandler(_channel, null));

  Map<String, Object?> savedData() => {
    for (final call in calls.where((call) => call.method == 'saveWidgetData'))
      (call.arguments as Map)['id'] as String: (call.arguments as Map)['data'],
  };

  group('CalendarWidgetService.update', () {
    test('saves every key the Kotlin side reads, and nothing else', () async {
      await CalendarWidgetService.update(
        calendar: testCalendar(weeks: 3),
        palette: testPalette,
        cellShape: CellShape.hex,
      );

      expect(savedData().keys, {
        HomeScreenWidgetKey.levels,
        HomeScreenWidgetKey.weeks,
        HomeScreenWidgetKey.colors,
        HomeScreenWidgetKey.shape,
        HomeScreenWidgetKey.username,
        HomeScreenWidgetKey.streak,
        HomeScreenWidgetKey.totalContributions,
      });
    });

    test('sends the payload the Home Screen Widget was built from', () async {
      final calendar = testCalendar(weeks: 3, totalContributions: 1234);

      await CalendarWidgetService.update(
        calendar: calendar,
        palette: testPalette,
        cellShape: CellShape.hex,
      );

      final data = savedData();

      expect(data[HomeScreenWidgetKey.weeks], 3);
      expect(data[HomeScreenWidgetKey.username], 'octocat');
      expect(data[HomeScreenWidgetKey.shape], CellShape.hex.name);
      expect(
        (data[HomeScreenWidgetKey.levels]! as String).length,
        3 * 7,
        reason: 'one level digit per Contribution Day, seven to a week',
      );
      expect(
        (data[HomeScreenWidgetKey.colors]! as String).split(
          homeScreenWidgetColorSeparator,
        ),
        hasLength(5),
      );
    });

    test('refreshes both Home Screen Widget sizes, never only one', () async {
      await CalendarWidgetService.update(
        calendar: testCalendar(weeks: 2),
        palette: testPalette,
        cellShape: CellShape.rounded,
      );

      final updated = calls
          .where((call) => call.method == 'updateWidget')
          .map((call) => (call.arguments as Map)['qualifiedAndroidName'])
          .toList();

      expect(updated, [
        'com.fbuireu.contribkit.ContribKitWidgetProvider',
        'com.fbuireu.contribkit.ContribKitSmallWidgetProvider',
      ]);
    });

    test(
      'a device with no Home Screen Widget is not an error the app shows',
      () async {
        refuse = true;

        await expectLater(
          CalendarWidgetService.update(
            calendar: testCalendar(weeks: 2),
            palette: testPalette,
            cellShape: CellShape.rounded,
          ),
          completes,
        );
      },
    );
  });
}
