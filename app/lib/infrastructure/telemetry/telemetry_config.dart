const _sentryDsn = String.fromEnvironment('SENTRY_DSN');
const _postHogProjectToken = String.fromEnvironment('POSTHOG_PROJECT_TOKEN');
const _postHogHost = String.fromEnvironment(
  'POSTHOG_HOST',
  defaultValue: 'https://eu.i.posthog.com',
);
const _environment = String.fromEnvironment(
  'TELEMETRY_ENVIRONMENT',
  defaultValue: 'development',
);
const _release = String.fromEnvironment('APP_RELEASE');

final class TelemetryConfig {
  const TelemetryConfig({
    required this.sentryDsn,
    required this.postHogProjectToken,
    required this.postHogHost,
    required this.environment,
    required this.release,
  });

  const TelemetryConfig.fromEnvironment()
    : sentryDsn = _sentryDsn,
      postHogProjectToken = _postHogProjectToken,
      postHogHost = _postHogHost,
      environment = _environment,
      release = _release;

  final String sentryDsn;
  final String postHogProjectToken;
  final String postHogHost;
  final String environment;
  final String release;

  bool get hasSentry => sentryDsn.isNotEmpty;

  bool get hasPostHog => postHogProjectToken.isNotEmpty;
}
