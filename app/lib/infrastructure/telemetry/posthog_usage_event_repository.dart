import 'package:contribkit/domain/repositories/usage_event_repository.dart';
import 'package:contribkit/domain/value_objects/usage_event.dart';
import 'package:contribkit/infrastructure/telemetry/telemetry_config.dart';
import 'package:posthog_flutter/posthog_flutter.dart';

typedef PostHogSetUp = Future<void> Function(PostHogConfig config);

typedef PostHogCapture = Future<void> Function(String eventName);

typedef PostHogOptOut = Future<void> Function({required bool optOut});

final class PostHogUsageEventRepository implements UsageEventRepository {
  PostHogUsageEventRepository({
    required this.config,
    PostHogSetUp? setUp,
    PostHogCapture? capture,
    PostHogOptOut? optOut,
  }) : _setUp = setUp ?? Posthog().setup,
       _capture = capture ?? _defaultCapture,
       _optOut = optOut ?? _defaultOptOut;

  final TelemetryConfig config;
  final PostHogSetUp _setUp;
  final PostHogCapture _capture;
  final PostHogOptOut _optOut;

  bool _started = false;

  bool get isStarted => _started;

  static Future<void> _defaultCapture(String eventName) =>
      Posthog().capture(eventName: eventName);

  static Future<void> _defaultOptOut({required bool optOut}) =>
      optOut ? Posthog().disable() : Posthog().enable();

  @override
  Future<void> start() async {
    if (_started || !config.hasPostHog) return;
    _started = true;

    final postHog = PostHogConfig(config.postHogProjectToken)
      ..host = config.postHogHost
      ..personProfiles = PostHogPersonProfiles.never
      ..sessionReplay = false
      ..captureApplicationLifecycleEvents = false
      ..preloadFeatureFlags = false
      ..sendFeatureFlagEvents = false
      ..surveys = false
      ..debug = false;

    await _setUp(postHog);
  }

  @override
  Future<void> record(UsageEvent event) async {
    if (!_started) return;
    try {
      await _capture(event.name);
    } catch (_) {
      return;
    }
  }

  @override
  Future<void> applyConsent({required bool granted}) async {
    if (granted) await start();
    if (!_started) return;
    await _optOut(optOut: !granted);
  }
}
