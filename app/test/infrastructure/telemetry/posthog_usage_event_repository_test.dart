import 'package:contribkit/domain/value_objects/calendar_request_source.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/export_delivery.dart';
import 'package:contribkit/domain/value_objects/export_format.dart';
import 'package:contribkit/domain/value_objects/usage_event.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/infrastructure/telemetry/posthog_usage_event_repository.dart';
import 'package:contribkit/infrastructure/telemetry/telemetry_config.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:posthog_flutter/posthog_flutter.dart';

import '../../support/fixtures.dart';

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
    test('sends nothing before start, even when configured', () async {
      final recorder = _Recorder();

      await _repository(recorder).record(UsageEvent.tipJarOpened);

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
              year: Year(2024, today: testToday),
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

  group('an SDK that throws', () {
    late List<FlutterErrorDetails> reported;

    setUp(() {
      reported = [];
      final original = FlutterError.onError;
      FlutterError.onError = reported.add;
      addTearDown(() => FlutterError.onError = original);
    });

    PostHogUsageEventRepository throwing({
      Object? onSetUp,
      Object? onOptOut,
      Object? onClose,
      List<_Captured>? captured,
      List<String>? closes,
    }) => PostHogUsageEventRepository(
      config: _configured,
      setUp: (_) async {
        if (onSetUp != null) throw onSetUp;
      },
      capture: ({required eventName, properties}) async =>
          captured?.add((eventName: eventName, properties: properties)),
      optOut: ({required bool optOut}) async {
        if (onOptOut != null) throw onOptOut;
      },
      close: () async {
        closes?.add('close');
        if (onClose != null) throw onClose;
      },
    );

    test('cannot stop the app starting, and reports what it threw', () async {
      final error = StateError('posthog setup failed');
      final captured = <_Captured>[];
      final repository = throwing(onSetUp: error, captured: captured);

      await expectLater(repository.start(), completes);
      await repository.record(UsageEvent.tipJarOpened);

      expect(repository.isStarted, isFalse);
      expect(captured, isEmpty);
      expect(reported.map((details) => details.exception), [error]);
    });

    test('leaves Usage Events off when a grant throws', () async {
      final error = StateError('posthog enable failed');
      final captured = <_Captured>[];
      final repository = throwing(onOptOut: error, captured: captured);

      await expectLater(repository.applyConsent(granted: true), completes);
      await repository.record(UsageEvent.tipJarOpened);

      expect(captured, isEmpty);
      expect(reported.map((details) => details.exception), [error]);
    });

    test(
      'sends nothing once a revocation throws, and closes the SDK instead',
      () async {
        final error = StateError('posthog disable failed');
        final captured = <_Captured>[];
        final closes = <String>[];
        final repository = throwing(
          onOptOut: error,
          captured: captured,
          closes: closes,
        );
        await repository.start();

        await expectLater(repository.applyConsent(granted: false), completes);
        await repository.record(UsageEvent.tipJarOpened);

        expect(captured, isEmpty);
        expect(closes, ['close']);
        expect(reported.map((details) => details.exception), [error]);
      },
    );

    test(
      'still sends nothing when closing after a failed revocation throws too',
      () async {
        final disabling = StateError('posthog disable failed');
        final closing = StateError('posthog close failed');
        final captured = <_Captured>[];
        final repository = throwing(
          onOptOut: disabling,
          onClose: closing,
          captured: captured,
        );
        await repository.start();

        await expectLater(repository.applyConsent(granted: false), completes);
        await repository.record(UsageEvent.tipJarOpened);

        expect(captured, isEmpty);
        expect(reported.map((details) => details.exception), [
          disabling,
          closing,
        ]);
      },
    );
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
      'hands the SDK a Tip Product under the product key its history uses',
      () async {
        final repository = defaults();
        await repository.start();

        await repository.record(
          UsageEvent.tipGiven(tipProduct: testTipProducts.first),
        );

        final capture = sdkCalls.singleWhere(
          (call) => call.method == 'capture',
        );
        expect(capture.arguments as Map, {
          'eventName': 'tipGiven',
          'properties': {'product': 'tip.small'},
        });
      },
    );

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
