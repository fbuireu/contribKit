import 'package:contribkit/domain/value_objects/calendar_request_source.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/export_delivery.dart';
import 'package:contribkit/domain/value_objects/export_format.dart';
import 'package:contribkit/domain/value_objects/usage_event.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/infrastructure/telemetry/posthog_usage_event_repository.dart';
import 'package:contribkit/infrastructure/telemetry/telemetry_config.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:posthog_flutter/posthog_flutter.dart';

const _configured = TelemetryConfig(
  sentryDsn: '',
  postHogProjectToken: 'phc_token',
  postHogHost: 'https://eu.i.posthog.test',
  environment: 'test',
  release: '',
);

const _unconfigured = TelemetryConfig(
  sentryDsn: '',
  postHogProjectToken: '',
  postHogHost: 'https://eu.i.posthog.test',
  environment: 'test',
  release: '',
);

typedef _Captured = ({String eventName, Map<String, Object>? properties});

final class _Recorder {
  PostHogConfig? config;
  final List<_Captured> captured = [];
  final List<bool> optOuts = [];

  Future<void> setUp(PostHogConfig value) async {
    config = value;
  }

  Future<void> capture({
    required String eventName,
    Map<String, Object>? properties,
  }) async {
    captured.add((eventName: eventName, properties: properties));
  }

  Future<void> optOut({required bool optOut}) async {
    optOuts.add(optOut);
  }
}

PostHogUsageEventRepository _repository(
  _Recorder recorder, {
  TelemetryConfig config = _configured,
}) => PostHogUsageEventRepository(
  config: config,
  setUp: recorder.setUp,
  capture: recorder.capture,
  optOut: recorder.optOut,
);

const _sdkChannel = MethodChannel('posthog_flutter');

void main() {
  final messenger =
      TestWidgetsFlutterBinding.ensureInitialized().defaultBinaryMessenger;
  group('start', () {
    test('does nothing without a project token', () async {
      final recorder = _Recorder();
      final repository = _repository(recorder, config: _unconfigured);

      await repository.start();

      expect(repository.isStarted, isFalse);
      expect(recorder.config, isNull);
    });

    test('sets up once, however many times it is asked', () async {
      final recorder = _Recorder();
      final repository = _repository(recorder);

      await repository.start();
      final first = recorder.config;
      await repository.start();

      expect(identical(recorder.config, first), isTrue);
    });

    test(
      'creates no person, replays no session and asks for no feature flag',
      () async {
        final recorder = _Recorder();

        await _repository(recorder).start();
        final config = recorder.config!;

        expect(config.projectToken, 'phc_token');
        expect(config.host, 'https://eu.i.posthog.test');
        expect(config.personProfiles, PostHogPersonProfiles.never);
        expect(config.sessionReplay, isFalse);
        expect(config.captureApplicationLifecycleEvents, isFalse);
        expect(config.preloadFeatureFlags, isFalse);
        expect(config.sendFeatureFlagEvents, isFalse);
        expect(config.surveys, isFalse);
      },
    );
  });

  group('record', () {
    test('sends nothing before start', () async {
      final recorder = _Recorder();

      await _repository(
        recorder,
        config: _unconfigured,
      ).record(UsageEvent.tipJarOpened);

      expect(recorder.captured, isEmpty);
    });

    test('sends the name and its typed properties, and nothing else', () async {
      final recorder = _Recorder();
      final repository = _repository(recorder);
      await repository.start();

      await repository.record(UsageEvent.tipJarOpened);
      await repository.record(
        UsageEvent.exportShared(
          format: ExportFormat.svg,
          delivery: ExportDelivery.share,
        ),
      );

      expect(recorder.captured.map((call) => call.eventName), [
        'tipJarOpened',
        'exportShared',
      ]);
      expect(recorder.captured.first.properties, isNull);
      expect(recorder.captured.last.properties, {
        'format': 'svg',
        'delivery': 'share',
      });
    });

    test('omits the properties map when an event carries none', () async {
      final recorder = _Recorder();
      final repository = _repository(recorder);
      await repository.start();

      await repository.record(UsageEvent.customizerOpened);

      expect(recorder.captured.single.properties, isNull);
    });

    test(
      'swallows its own failure, because telemetry may never break the app',
      () async {
        final repository = PostHogUsageEventRepository(
          config: _configured,
          setUp: (_) async {},
          capture: ({required eventName, properties}) async =>
              throw StateError('posthog down'),
          optOut: ({required bool optOut}) async {},
        );
        await repository.start();

        await expectLater(
          repository.record(
            UsageEvent.calendarViewed(
              year: Year(2024),
              source: CalendarRequestSource.typed,
              fromCache: false,
            ),
          ),
          completes,
        );
      },
    );
  });

  group('applyConsent', () {
    test('starts and opts in when granted', () async {
      final recorder = _Recorder();
      final repository = _repository(recorder);

      await repository.applyConsent(granted: true);

      expect(repository.isStarted, isTrue);
      expect(recorder.optOuts, [false]);
    });

    test('opts out when withdrawn', () async {
      final recorder = _Recorder();
      final repository = _repository(recorder);
      await repository.start();

      await repository.applyConsent(granted: false);

      expect(recorder.optOuts, [true]);
    });

    test('does not start an unconfigured build just to opt it out', () async {
      final recorder = _Recorder();

      await _repository(
        recorder,
        config: _unconfigured,
      ).applyConsent(granted: true);

      expect(recorder.optOuts, isEmpty);
    });
  });

  group('the SDK entry points it uses by default', () {
    late List<MethodCall> sdkCalls;

    setUp(() {
      sdkCalls = [];
      messenger.setMockMethodCallHandler(_sdkChannel, (call) async {
        sdkCalls.add(call);
        return null;
      });
    });

    tearDown(() => messenger.setMockMethodCallHandler(_sdkChannel, null));

    PostHogUsageEventRepository defaults() =>
        PostHogUsageEventRepository(config: _configured, setUp: (_) async {});

    test('hands the SDK the name and the typed properties', () async {
      final repository = defaults();
      await repository.start();

      await repository.record(UsageEvent.cellShapeChosen(shape: CellShape.hex));

      final capture = sdkCalls.singleWhere((call) => call.method == 'capture');
      final arguments = capture.arguments as Map;
      expect(arguments['eventName'], 'cellShapeChosen');
      expect(arguments['properties'], {'cellShape': 'hex'});
    });

    test(
      'hands the SDK no properties map for an event that has none',
      () async {
        final repository = defaults();
        await repository.start();

        await repository.record(UsageEvent.exportOpened);

        final capture = sdkCalls.singleWhere(
          (call) => call.method == 'capture',
        );
        expect(capture.arguments as Map, {'eventName': 'exportOpened'});
      },
    );

    test(
      'opts the SDK out when consent is withdrawn and back in when granted',
      () async {
        final repository = defaults();
        await repository.start();

        await repository.applyConsent(granted: false);
        await repository.applyConsent(granted: true);

        expect(
          sdkCalls
              .map((call) => call.method)
              .where((method) => method == 'disable' || method == 'enable'),
          ['disable', 'enable'],
        );
      },
    );
  });
}
