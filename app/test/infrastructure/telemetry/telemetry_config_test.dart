import 'package:contribkit/infrastructure/telemetry/telemetry_config.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('TelemetryConfig.fromEnvironment', () {
    const config = TelemetryConfig.fromEnvironment();

    test('ships neither SDK when no dart-define supplies a credential', () {
      expect(config.hasSentry, isFalse);
      expect(config.hasPostHog, isFalse);
    });

    test(
      'ingests in the EU by default, which is where the policy says it goes',
      () {
        expect(config.postHogHost, 'https://eu.i.posthog.com');
      },
    );

    test('calls an unlabelled build development, never production', () {
      expect(config.environment, 'development');
    });
  });

  group('TelemetryConfig', () {
    test('has a credential exactly when the string is not empty', () {
      const filled = TelemetryConfig(
        sentryDsn: 'https://key@example.test/1',
        postHogProjectToken: 'phc_token',
        postHogHost: 'https://eu.i.posthog.test',
        environment: 'production',
        release: 'contribkit@1.0.0',
      );

      expect(filled.hasSentry, isTrue);
      expect(filled.hasPostHog, isTrue);
    });
  });
}
