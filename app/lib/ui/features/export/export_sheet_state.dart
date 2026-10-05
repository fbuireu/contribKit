sealed class ExportSheetState {
  const ExportSheetState();

  bool get isExporting => this is ExportInFlight;

  bool get isCopied => this is ExportCopied;

  String? get failureMessage => switch (this) {
    ExportFailed(:final message) => message,
    _ => null,
  };

  ExportInFlight? beginning() => isExporting ? null : const ExportInFlight();
}

final class ExportIdle extends ExportSheetState {
  const ExportIdle();
}

final class ExportInFlight extends ExportSheetState {
  const ExportInFlight();
}

final class ExportCopied extends ExportSheetState {
  const ExportCopied();
}

final class ExportFailed extends ExportSheetState {
  const ExportFailed({required this.message});
  final String message;
}
