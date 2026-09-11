enum ConsentChoice { unasked, granted, denied }

final class TelemetryConsent {
  const TelemetryConsent({
    this.diagnosticReports = ConsentChoice.unasked,
    this.usageEvents = ConsentChoice.unasked,
  });

  final ConsentChoice diagnosticReports;
  final ConsentChoice usageEvents;

  bool get mayReportDiagnostics => diagnosticReports != ConsentChoice.denied;

  bool get mayRecordUsageEvents => usageEvents == ConsentChoice.granted;

  bool get isAnswered =>
      diagnosticReports != ConsentChoice.unasked &&
      usageEvents != ConsentChoice.unasked;

  TelemetryConsent copyWith({
    ConsentChoice? diagnosticReports,
    ConsentChoice? usageEvents,
  }) => TelemetryConsent(
    diagnosticReports: diagnosticReports ?? this.diagnosticReports,
    usageEvents: usageEvents ?? this.usageEvents,
  );

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TelemetryConsent &&
          other.diagnosticReports == diagnosticReports &&
          other.usageEvents == usageEvents;

  @override
  int get hashCode => Object.hash(diagnosticReports, usageEvents);

  @override
  String toString() =>
      'TelemetryConsent(diagnosticReports: ${diagnosticReports.name}, usageEvents: ${usageEvents.name})';
}
