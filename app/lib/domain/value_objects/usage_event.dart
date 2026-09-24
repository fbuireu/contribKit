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
  const UsageEvent._(this.name, [this.properties = const {}]);

  final String name;

  final Map<String, Object> properties;

  static const customizerOpened = UsageEvent._('customizerOpened');

  static const exportOpened = UsageEvent._('exportOpened');

  static const tipJarOpened = UsageEvent._('tipJarOpened');

  static const contactOpened = UsageEvent._('contactOpened');

  static const privacyOpened = UsageEvent._('privacyOpened');

  static UsageEvent calendarViewed({
    required Year year,
    required CalendarRequestSource source,
    required bool fromCache,
  }) => UsageEvent._('calendarViewed', {
    'year': year.value,
    'source': source.name,
    'fromCache': fromCache,
  });

  static UsageEvent calendarRequestFailed({
    required CalendarRequestSource source,
    required CalendarFailureKind reason,
  }) => UsageEvent._('calendarRequestFailed', {
    'source': source.name,
    'reason': reason.name,
  });

  static UsageEvent yearChosen({required Year year}) =>
      UsageEvent._('yearChosen', {'year': year.value});

  static UsageEvent paletteChosen({required Palette palette}) =>
      UsageEvent._('paletteChosen', {'palette': palette.key});

  static UsageEvent cellShapeChosen({required CellShape shape}) =>
      UsageEvent._('cellShapeChosen', {'cellShape': shape.name});

  static UsageEvent cellSizeChosen({required CellSize size}) =>
      UsageEvent._('cellSizeChosen', {'cellSize': size.name});

  static UsageEvent backgroundChosen({required BackgroundPreset preset}) =>
      UsageEvent._('backgroundChosen', {'background': preset.name});

  static UsageEvent exportShared({
    required ExportFormat format,
    required ExportDelivery delivery,
  }) => UsageEvent._('exportShared', {
    'format': format.name,
    'delivery': delivery.name,
  });

  static UsageEvent exportFailed({required ExportFormat format}) =>
      UsageEvent._('exportFailed', {'format': format.name});

  static UsageEvent tipGiven({required TipProduct product}) =>
      UsageEvent._('tipGiven', {'product': product.id});

  static UsageEvent tipCancelled({required TipProduct product}) =>
      UsageEvent._('tipCancelled', {'product': product.id});

  static UsageEvent tipFailed({required TipProduct product}) =>
      UsageEvent._('tipFailed', {'product': product.id});

  static UsageEvent contactMessageSent({required ContactOutcome outcome}) =>
      UsageEvent._('contactMessageSent', {'outcome': outcome.name});

  static UsageEvent themeChanged({required AppThemeMode mode}) =>
      UsageEvent._('themeChanged', {'mode': mode.name});

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
