import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/value_objects/app_settings.dart';
import 'package:contribkit/domain/value_objects/background_preset.dart';
import 'package:contribkit/domain/value_objects/calendar_failure_kind.dart';
import 'package:contribkit/domain/value_objects/calendar_request_source.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/contact_outcome.dart';
import 'package:contribkit/domain/value_objects/export_delivery.dart';
import 'package:contribkit/domain/value_objects/export_format.dart';
import 'package:contribkit/domain/value_objects/usage_event.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/fixtures.dart';

typedef _Expected = ({
  UsageEvent event,
  String name,
  Map<String, Object> properties,
});

final List<_Expected> _catalogue = [
  (
    event: UsageEvent.customizerOpened,
    name: 'customizerOpened',
    properties: {},
  ),
  (event: UsageEvent.exportOpened, name: 'exportOpened', properties: {}),
  (event: UsageEvent.tipJarOpened, name: 'tipJarOpened', properties: {}),
  (event: UsageEvent.contactOpened, name: 'contactOpened', properties: {}),
  (event: UsageEvent.privacyOpened, name: 'privacyOpened', properties: {}),
  (
    event: UsageEvent.calendarViewed(
      year: Year(2024),
      source: CalendarRequestSource.suggestion,
      fromCache: true,
    ),
    name: 'calendarViewed',
    properties: {'year': 2024, 'source': 'suggestion', 'fromCache': true},
  ),
  (
    event: UsageEvent.calendarRequestFailed(
      source: CalendarRequestSource.refresh,
      reason: CalendarFailureKind.rateLimited,
    ),
    name: 'calendarRequestFailed',
    properties: {'source': 'refresh', 'reason': 'rateLimited'},
  ),
  (
    event: UsageEvent.yearChosen(year: Year(2019)),
    name: 'yearChosen',
    properties: {'year': 2019},
  ),
  (
    event: UsageEvent.paletteChosen(palette: testPalette),
    name: 'paletteChosen',
    properties: {'palette': 'nord'},
  ),
  (
    event: UsageEvent.cellShapeChosen(shape: CellShape.hex),
    name: 'cellShapeChosen',
    properties: {'cellShape': 'hex'},
  ),
  (
    event: UsageEvent.cellSizeChosen(size: CellSize.large),
    name: 'cellSizeChosen',
    properties: {'cellSize': 'large'},
  ),
  (
    event: UsageEvent.backgroundChosen(preset: BackgroundPreset.navy),
    name: 'backgroundChosen',
    properties: {'background': 'navy'},
  ),
  (
    event: UsageEvent.exportShared(
      format: ExportFormat.markdown,
      delivery: ExportDelivery.clipboard,
    ),
    name: 'exportShared',
    properties: {'format': 'markdown', 'delivery': 'clipboard'},
  ),
  (
    event: UsageEvent.exportFailed(format: ExportFormat.png),
    name: 'exportFailed',
    properties: {'format': 'png'},
  ),
  (
    event: UsageEvent.tipGiven(product: testTipProducts.first),
    name: 'tipGiven',
    properties: {'product': 'tip.small'},
  ),
  (
    event: UsageEvent.tipCancelled(product: testTipProducts.last),
    name: 'tipCancelled',
    properties: {'product': 'tip.large'},
  ),
  (
    event: UsageEvent.tipFailed(product: testTipProducts[1]),
    name: 'tipFailed',
    properties: {'product': 'tip.medium'},
  ),
  (
    event: UsageEvent.contactMessageSent(outcome: ContactOutcome.failed),
    name: 'contactMessageSent',
    properties: {'outcome': 'failed'},
  ),
  (
    event: UsageEvent.themeChanged(mode: AppThemeMode.light),
    name: 'themeChanged',
    properties: {'mode': 'light'},
  ),
];

void main() {
  group('UsageEvent', () {
    test('every constructor yields its wire name and typed properties', () {
      for (final (:event, :name, :properties) in _catalogue) {
        expect(event.name, name);
        expect(event.properties, properties);
      }
    });

    test('every property value is a String, an int or a bool', () {
      for (final (:event, name: _, properties: _) in _catalogue) {
        for (final value in event.properties.values) {
          expect(
            value,
            anyOf(isA<String>(), isA<int>(), isA<bool>()),
            reason: '${event.name} carries $value',
          );
        }
      }
    });

    test('no event carries a Username, even one on the way in', () {
      final username = Username('octocat');
      final calendarEvents = [
        UsageEvent.calendarViewed(
          year: Year(2024),
          source: CalendarRequestSource.typed,
          fromCache: false,
        ),
        UsageEvent.calendarRequestFailed(
          source: CalendarRequestSource.typed,
          reason: CalendarFailureKind.of(NotFoundFailure(username: username)),
        ),
      ];

      for (final event in calendarEvents) {
        expect(event.properties.values, isNot(contains(username.value)));
        expect(event.toString(), isNot(contains(username.value)));
      }
    });

    test('compares by name and properties, whatever the map order', () {
      final one = UsageEvent.calendarViewed(
        year: Year(2024),
        source: CalendarRequestSource.typed,
        fromCache: false,
      );
      final same = UsageEvent.calendarViewed(
        year: Year(2024),
        source: CalendarRequestSource.typed,
        fromCache: false,
      );
      final otherYear = UsageEvent.calendarViewed(
        year: Year(2023),
        source: CalendarRequestSource.typed,
        fromCache: false,
      );

      expect(one, same);
      expect(one.hashCode, same.hashCode);
      expect(one, isNot(otherYear));
      expect(
        UsageEvent.yearChosen(year: Year(2024)),
        isNot(UsageEvent.customizerOpened),
      );
      expect(UsageEvent.customizerOpened, isNot(UsageEvent.exportOpened));
    });

    test('a missing key and a differing value both read as unequal', () {
      final shared = UsageEvent.exportShared(
        format: ExportFormat.svg,
        delivery: ExportDelivery.share,
      );

      expect(
        shared,
        isNot(
          UsageEvent.exportShared(
            format: ExportFormat.svg,
            delivery: ExportDelivery.clipboard,
          ),
        ),
      );
      expect(shared, isNot(UsageEvent.exportFailed(format: ExportFormat.svg)));
    });

    test('prints the name, and the properties only when there are some', () {
      expect(
        UsageEvent.customizerOpened.toString(),
        'UsageEvent(customizerOpened)',
      );
      expect(
        UsageEvent.yearChosen(year: Year(2020)).toString(),
        'UsageEvent(yearChosen, {year: 2020})',
      );
    });
  });

  group('CalendarFailureKind.of', () {
    test('names the kinds a calendar request can fail as', () {
      expect(
        CalendarFailureKind.of(const NetworkFailure(message: 'offline')),
        CalendarFailureKind.network,
      );
      expect(
        CalendarFailureKind.of(NotFoundFailure(username: Username('ghost'))),
        CalendarFailureKind.notFound,
      );
      expect(
        CalendarFailureKind.of(const RateLimitedFailure()),
        CalendarFailureKind.rateLimited,
      );
      expect(
        CalendarFailureKind.of(const ParseFailure(message: 'markup')),
        CalendarFailureKind.parse,
      );
      expect(
        CalendarFailureKind.of(const CacheFailure(message: 'box')),
        CalendarFailureKind.cache,
      );
    });

    test('maps every kind a calendar request never raises to unexpected', () {
      const unrelated = [
        AssetFailure(asset: 'assets/palettes.json'),
        DeliveryFailure(message: 'refused'),
        ExportFailure(message: 'no canvas'),
        TipFailure(message: 'declined'),
        UnexpectedFailure(message: 'boom'),
      ];

      for (final failure in unrelated) {
        expect(CalendarFailureKind.of(failure), CalendarFailureKind.unexpected);
      }
    });
  });
}
