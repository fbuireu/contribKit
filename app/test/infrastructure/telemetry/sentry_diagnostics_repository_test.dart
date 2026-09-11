import 'package:contribkit/infrastructure/telemetry/sentry_diagnostics_repository.dart';
import 'package:contribkit/infrastructure/telemetry/telemetry_config.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

const _configured = TelemetryConfig(
  sentryDsn: 'https://key@example.test/1',
  postHogProjectToken: '',
  postHogHost: 'https://eu.i.posthog.test',
  environment: 'test',
  release: 'contribkit@1.2.3',
);

const _unconfigured = TelemetryConfig(
  sentryDsn: '',
  postHogProjectToken: '',
  postHogHost: 'https://eu.i.posthog.test',
  environment: 'test',
  release: '',
);

final class _Recorder {
  SentryFlutterOptions? options;
  final List<Object> sent = [];
  int shutDowns = 0;

  Future<void> initialise(FlutterOptionsConfiguration configure) async {
    final built = SentryFlutterOptions();
    await configure(built);
    options = built;
  }

  Future<SentryId> send(Object error, {StackTrace? stackTrace}) async {
    sent.add(error);
    return SentryId.newId();
  }

  Future<void> shutDown() async {
    shutDowns += 1;
  }
}

SentryDiagnosticsRepository _repository(
  _Recorder recorder, {
  TelemetryConfig config = _configured,
}) => SentryDiagnosticsRepository(
  config: config,
  initialise: recorder.initialise,
  send: recorder.send,
  shutDown: recorder.shutDown,
);

void main() {
  group('start', () {
    test(
      'does nothing at all without a DSN, so a local build is inert',
      () async {
        final recorder = _Recorder();
        final repository = _repository(recorder, config: _unconfigured);

        await repository.start();

        expect(repository.isStarted, isFalse);
        expect(recorder.options, isNull);
      },
    );

    test('initialises once, however many times it is asked', () async {
      final recorder = _Recorder();
      final repository = _repository(recorder);

      await repository.start();
      final first = recorder.options;
      await repository.start();

      expect(repository.isStarted, isTrue);
      expect(identical(recorder.options, first), isTrue);
    });

    test('turns off everything that would carry personal data', () async {
      final recorder = _Recorder();

      await _repository(recorder).start();
      final options = recorder.options!;

      expect(options.sendDefaultPii, isFalse);
      expect(options.attachScreenshot, isFalse);
      expect(options.maxBreadcrumbs, 0);
      expect(options.enableAutoNativeBreadcrumbs, isFalse);
      expect(options.enableUserInteractionBreadcrumbs, isFalse);
      expect(options.enableAutoSessionTracking, isFalse);
      expect(options.dsn, _configured.sentryDsn);
      expect(options.environment, 'test');
      expect(options.release, 'contribkit@1.2.3');
    });

    test('leaves the release unset rather than setting it empty', () async {
      final recorder = _Recorder();

      await _repository(
        recorder,
        config: const TelemetryConfig(
          sentryDsn: 'https://key@example.test/1',
          postHogProjectToken: '',
          postHogHost: '',
          environment: 'test',
          release: '',
        ),
      ).start();

      expect(recorder.options!.release, isNot(''));
    });
  });

  group('the scrubber', () {
    Future<SentryEvent?> scrub(SentryEvent event) async {
      final recorder = _Recorder();
      await _repository(recorder).start();
      return await recorder.options!.beforeSend!(event, Hint());
    }

    test(
      'replaces every exception message, which is where a Username hides',
      () async {
        final event = SentryEvent(
          exceptions: const [
            SentryException(
              type: 'NotFoundFailure',
              value: 'NotFoundFailure: user "octocat" not found',
            ),
            SentryException(
              type: 'CacheFailure',
              value: r'CacheFailure: C:\Users\someone\box.hive',
            ),
          ],
        );

        final scrubbed = await scrub(event);

        expect(
          scrubbed!.exceptions!.map((exception) => exception.value),
          everyElement(redactedDiagnosticValue),
        );
      },
    );

    test(
      'keeps the exception type, which is the whole diagnostic value',
      () async {
        final event = SentryEvent(
          exceptions: const [
            SentryException(
              type: 'NetworkFailure',
              value: 'https://github.com/users/octocat',
            ),
          ],
        );

        final scrubbed = await scrub(event);

        expect(scrubbed!.exceptions!.single.type, 'NetworkFailure');
      },
    );

    test('drops breadcrumbs', () async {
      final event = SentryEvent(
        breadcrumbs: [Breadcrumb(message: 'tapped octocat')],
      );

      final scrubbed = await scrub(event);

      expect(scrubbed!.breadcrumbs, isEmpty);
    });

    test('replaces a message when there is one, and invents none when there is not', () async {
      final withMessage = await scrub(
        SentryEvent(message: const SentryMessage('looking up octocat')),
      );
      final without = await scrub(SentryEvent());

      expect(withMessage!.message!.formatted, redactedDiagnosticValue);
      expect(without!.message, isNull);
    });

    test('sends nothing once consent is withdrawn', () async {
      final recorder = _Recorder();
      final repository = _repository(recorder);
      await repository.start();
      final beforeSend = recorder.options!.beforeSend!;

      await repository.applyConsent(granted: false);

      expect(await beforeSend(SentryEvent(), Hint()), isNull);
    });
  });

  group('report', () {
    test(
      'sends nothing before start, so an unconfigured build is silent',
      () async {
        final recorder = _Recorder();
        final repository = _repository(recorder, config: _unconfigured);

        await repository.report(error: StateError('boom'));

        expect(recorder.sent, isEmpty);
      },
    );

    test('passes the error through once started', () async {
      final recorder = _Recorder();
      final repository = _repository(recorder);
      await repository.start();

      final error = StateError('boom');
      await repository.report(error: error, stackTrace: StackTrace.current);

      expect(recorder.sent, [error]);
    });

    test(
      'swallows its own failure, because telemetry may never break the app',
      () async {
        final repository = SentryDiagnosticsRepository(
          config: _configured,
          initialise: (_) async {},
          send: (_, {StackTrace? stackTrace}) async =>
              throw StateError('sentry down'),
          shutDown: () async {},
        );
        await repository.start();

        await expectLater(
          repository.report(error: StateError('boom')),
          completes,
        );
      },
    );
  });

  group('applyConsent', () {
    test('starts when granted', () async {
      final recorder = _Recorder();
      final repository = _repository(recorder);

      await repository.applyConsent(granted: true);

      expect(repository.isStarted, isTrue);
    });

    test('shuts down when withdrawn, and only once', () async {
      final recorder = _Recorder();
      final repository = _repository(recorder);
      await repository.start();

      await repository.applyConsent(granted: false);
      await repository.applyConsent(granted: false);

      expect(repository.isStarted, isFalse);
      expect(recorder.shutDowns, 1);
    });
  });
}
