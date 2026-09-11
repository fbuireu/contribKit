import 'package:contribkit/domain/value_objects/usage_event.dart';
import 'package:contribkit/infrastructure/telemetry/posthog_usage_event_repository.dart';
import 'package:contribkit/infrastructure/telemetry/telemetry_config.dart';
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

final class _Recorder {
  PostHogConfig? config;
  final List<String> captured = [];
  final List<bool> optOuts = [];

  Future<void> setUp(PostHogConfig value) async {
    config = value;
  }

  Future<void> capture(String eventName) async {
    captured.add(eventName);
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

void main() {
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
      ).record(UsageEvent.exportShared);

      expect(recorder.captured, isEmpty);
    });

    test(
      'sends the event name and nothing else, so no payload can carry data',
      () async {
        final recorder = _Recorder();
        final repository = _repository(recorder);
        await repository.start();

        await repository.record(UsageEvent.tipJarOpened);
        await repository.record(UsageEvent.exportShared);

        expect(recorder.captured, ['tipJarOpened', 'exportShared']);
      },
    );

    test(
      'swallows its own failure, because telemetry may never break the app',
      () async {
        final repository = PostHogUsageEventRepository(
          config: _configured,
          setUp: (_) async {},
          capture: (_) async => throw StateError('posthog down'),
          optOut: ({required bool optOut}) async {},
        );
        await repository.start();

        await expectLater(
          repository.record(UsageEvent.calendarViewed),
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
}
