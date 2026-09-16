import 'package:contribkit/domain/repositories/diagnostics_repository.dart';
import 'package:contribkit/infrastructure/telemetry/telemetry_config.dart';
import 'package:flutter/widgets.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

typedef SentryInitialiser = Future<void> Function(
  FlutterOptionsConfiguration configure,
);

typedef SentryReporter = Future<SentryId> Function(
  Object error, {
  StackTrace? stackTrace,
});

const redactedDiagnosticValue = 'redacted';

final class SentryDiagnosticsRepository implements DiagnosticsRepository {
  SentryDiagnosticsRepository({
    required this.config,
    this.maskedWidgets = const {},
    SentryInitialiser? initialise,
    SentryReporter? send,
    Future<void> Function()? shutDown,
  }) : _initialise = initialise ?? SentryFlutter.init,
       _send = send ?? _defaultSend,
       _shutDown = shutDown ?? Sentry.close;

  final TelemetryConfig config;
  final Set<Type> maskedWidgets;
  final SentryInitialiser _initialise;
  final SentryReporter _send;
  final Future<void> Function() _shutDown;

  bool _started = false;

  bool get isStarted => _started;

  static Future<SentryId> _defaultSend(
    Object error, {
    StackTrace? stackTrace,
  }) => Sentry.captureException(error, stackTrace: stackTrace);

  @override
  Future<void> start() async {
    if (_started || !config.hasSentry) return;
    _started = true;

    await _initialise(_configure);
  }

  void _configure(SentryFlutterOptions options) {
    options
      ..dsn = config.sentryDsn
      ..environment = config.environment
      ..sendDefaultPii = false
      ..attachStacktrace = true
      ..attachScreenshot = false
      ..enableAutoSessionTracking = false
      ..enableAutoNativeBreadcrumbs = false
      ..enableUserInteractionBreadcrumbs = false
      ..enableUserInteractionTracing = false
      ..enableAutoPerformanceTracing = false
      ..maxBreadcrumbs = 0
      ..beforeSend = _scrub;
    options.replay
      ..sessionSampleRate = 0.0
      ..onErrorSampleRate = 1.0
      ..quality = SentryReplayQuality.low;
    options.privacy
      ..maskAllText = true
      ..maskAllImages = true
      ..maskCallback<Widget>(maskingDecision);
    if (config.release.isNotEmpty) options.release = config.release;
  }

  SentryMaskingDecision maskingDecision(Element element, Widget widget) =>
      maskedWidgets.contains(widget.runtimeType)
      ? SentryMaskingDecision.mask
      : SentryMaskingDecision.continueProcessing;

  @override
  Future<void> report({required Object error, StackTrace? stackTrace}) async {
    if (!_started) return;
    try {
      await _send(error, stackTrace: stackTrace);
    } catch (_) {
      return;
    }
  }

  @override
  Future<void> applyConsent({required bool granted}) async {
    if (granted) {
      await start();
      return;
    }
    if (!_started) return;
    _started = false;
    await _shutDown();
  }

  SentryEvent? _scrub(SentryEvent event, Hint hint) {
    if (!_started) return null;

    event.breadcrumbs = const [];
    for (final exception in event.exceptions ?? const <SentryException>[]) {
      exception.value = redactedDiagnosticValue;
    }
    if (event.message != null) {
      event.message = SentryMessage(redactedDiagnosticValue);
    }

    return event;
  }
}
