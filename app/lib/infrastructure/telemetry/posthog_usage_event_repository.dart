import 'package:contribkit/domain/repositories/usage_event_repository.dart';
import 'package:contribkit/domain/value_objects/usage_event.dart';
import 'package:contribkit/infrastructure/telemetry/telemetry_config.dart';
import 'package:contribkit/infrastructure/telemetry/telemetry_failure.dart';
import 'package:posthog_flutter/posthog_flutter.dart';

typedef PostHogSetUp = Future<void> Function(PostHogConfig config);

typedef PostHogCapture = Future<void> Function({
  required String eventName,
  Map<String, Object>? properties,
});

typedef PostHogOptOut = Future<void> Function({required bool optOut});

typedef PostHogClose = Future<void> Function();

final class PostHogUsageEventRepository implements UsageEventRepository {
  PostHogUsageEventRepository({
    required this.config,
    PostHogSetUp? setUp,
    PostHogCapture? capture,
    PostHogOptOut? optOut,
    PostHogClose? close,
  }) : _setUp = setUp ?? Posthog().setup,
       _capture = capture ?? _defaultCapture,
       _optOut = optOut ?? _defaultOptOut,
       _close = close ?? Posthog().close;

  final TelemetryConfig config;
  final PostHogSetUp _setUp;
  final PostHogCapture _capture;
  final PostHogOptOut _optOut;
  final PostHogClose _close;

  bool _started = false;
  bool _sending = false;

  bool get isStarted => _started;

  static Future<void> _defaultCapture({
    required String eventName,
    Map<String, Object>? properties,
  }) => Posthog().capture(eventName: eventName, properties: properties);

  static Future<void> _defaultOptOut({required bool optOut}) =>
      optOut ? Posthog().disable() : Posthog().enable();

  @override
  Future<void> start() async {
    if (_started || !config.hasPostHog) return;
    _started = true;
    _sending = true;

    final postHog = PostHogConfig(config.postHogProjectToken)
      ..host = config.postHogHost
      ..personProfiles = PostHogPersonProfiles.never
      ..sessionReplay = false
      ..captureApplicationLifecycleEvents = false
      ..preloadFeatureFlags = false
      ..sendFeatureFlagEvents = false
      ..surveys = false
      ..debug = false;

    try {
      await _setUp(postHog);
    } catch (error, stackTrace) {
      _started = false;
      _sending = false;
      reportTelemetryFailure(
        error: error,
        stackTrace: stackTrace,
        during: 'while setting PostHog up',
      );
    }
  }

  @override
  Future<void> record(UsageEvent event) async {
    if (!_sending) return;
    try {
      await _capture(
        eventName: event.name,
        properties: event.properties.isEmpty ? null : event.properties,
      );
    } catch (_) {
      return;
    }
  }

  @override
  Future<void> applyConsent({required bool granted}) async {
    if (!granted) return _withdraw();
    await start();
    if (!_started) return;
    try {
      await _optOut(optOut: false);
      _sending = true;
    } catch (error, stackTrace) {
      _sending = false;
      reportTelemetryFailure(
        error: error,
        stackTrace: stackTrace,
        during: 'while opting PostHog in',
      );
    }
  }

  Future<void> _withdraw() async {
    _sending = false;
    if (!_started) return;
    try {
      await _optOut(optOut: true);
    } catch (error, stackTrace) {
      reportTelemetryFailure(
        error: error,
        stackTrace: stackTrace,
        during: 'while opting PostHog out',
      );
      await _closeAfterFailedOptOut();
    }
  }

  Future<void> _closeAfterFailedOptOut() async {
    try {
      await _close();
      _started = false;
    } catch (error, stackTrace) {
      reportTelemetryFailure(
        error: error,
        stackTrace: stackTrace,
        during: 'while closing PostHog',
      );
    }
  }
}
