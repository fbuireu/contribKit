import 'package:contribkit/domain/value_objects/app_settings.dart';
import 'package:contribkit/domain/value_objects/background_preset.dart';
import 'package:contribkit/domain/value_objects/calendar_failure_kind.dart';
import 'package:contribkit/domain/value_objects/calendar_request_source.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/contact_outcome.dart';
import 'package:contribkit/domain/value_objects/export_delivery.dart';
import 'package:contribkit/domain/value_objects/export_format.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/domain/value_objects/tip_product.dart';
import 'package:contribkit/domain/value_objects/year.dart';

final class UsageEvent {
  UsageEvent._({required this.name, Map<String, Object> properties = const {}})
    : properties = Map.unmodifiable(properties);

  final String name;

  final Map<String, Object> properties;

  static final customizerOpened = UsageEvent._(name: 'customizerOpened');

  static final exportOpened = UsageEvent._(name: 'exportOpened');

  static final tipJarOpened = UsageEvent._(name: 'tipJarOpened');

  static final contactOpened = UsageEvent._(name: 'contactOpened');

  static final privacyOpened = UsageEvent._(name: 'privacyOpened');

  static UsageEvent calendarViewed({
    required Year year,
    required CalendarRequestSource source,
    required bool fromCache,
  }) => UsageEvent._(
    name: 'calendarViewed',
    properties: {
      'year': year.value,
      'source': source.name,
      'fromCache': fromCache,
    },
  );

  static UsageEvent calendarRequestFailed({
    required CalendarRequestSource source,
    required CalendarFailureKind reason,
  }) => UsageEvent._(
    name: 'calendarRequestFailed',
    properties: {'source': source.name, 'reason': reason.name},
  );

  static UsageEvent yearChosen({required Year year}) =>
      UsageEvent._(name: 'yearChosen', properties: {'year': year.value});

  static UsageEvent paletteChosen({required Palette palette}) =>
      UsageEvent._(name: 'paletteChosen', properties: {'palette': palette.key});

  static UsageEvent cellShapeChosen({required CellShape shape}) => UsageEvent._(
    name: 'cellShapeChosen',
    properties: {'cellShape': shape.name},
  );

  static UsageEvent cellSizeChosen({required CellSize size}) =>
      UsageEvent._(name: 'cellSizeChosen', properties: {'cellSize': size.name});

  static UsageEvent backgroundChosen({required BackgroundPreset preset}) =>
      UsageEvent._(
        name: 'backgroundChosen',
        properties: {'background': preset.name},
      );

  static UsageEvent exportShared({
    required ExportFormat format,
    required ExportDelivery delivery,
  }) => UsageEvent._(
    name: 'exportShared',
    properties: {'format': format.name, 'delivery': delivery.name},
  );

  static UsageEvent exportFailed({required ExportFormat format}) =>
      UsageEvent._(name: 'exportFailed', properties: {'format': format.name});

  static UsageEvent tipGiven({required TipProduct tipProduct}) =>
      UsageEvent._(name: 'tipGiven', properties: {'product': tipProduct.id});

  static UsageEvent tipCancelled({required TipProduct tipProduct}) =>
      UsageEvent._(
        name: 'tipCancelled',
        properties: {'product': tipProduct.id},
      );

  static UsageEvent tipFailed({required TipProduct tipProduct}) =>
      UsageEvent._(name: 'tipFailed', properties: {'product': tipProduct.id});

  static UsageEvent contactMessageSent({required ContactOutcome outcome}) =>
      UsageEvent._(
        name: 'contactMessageSent',
        properties: {'outcome': outcome.name},
      );

  static UsageEvent themeChanged({required AppThemeMode mode}) =>
      UsageEvent._(name: 'themeChanged', properties: {'mode': mode.name});

  bool _sameProperties(Map<String, Object> other) {
    if (other.length != properties.length) return false;
    for (final MapEntry(:key, :value) in properties.entries) {
      if (!other.containsKey(key) || other[key] != value) return false;
    }
    return true;
  }

  @override
  bool operator ==(Object other) =>
      other is UsageEvent &&
      other.name == name &&
      _sameProperties(other.properties);

  @override
  int get hashCode => Object.hash(
    name,
    Object.hashAllUnordered(
      properties.entries.map((entry) => Object.hash(entry.key, entry.value)),
    ),
  );

  @override
  String toString() => properties.isEmpty
      ? 'UsageEvent($name)'
      : 'UsageEvent($name, $properties)';
}
