import 'package:flutter/foundation.dart';

void reportTelemetryFailure({
  required Object error,
  required StackTrace stackTrace,
  required String during,
}) => FlutterError.reportError(
  FlutterErrorDetails(
    exception: error,
    stack: stackTrace,
    library: 'contribkit telemetry',
    context: ErrorDescription(during),
  ),
);
