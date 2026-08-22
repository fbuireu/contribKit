import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';

enum ExportFormat {
  png,
  svg,
  markdown;

  static const ExportFormat fallback = ExportFormat.png;

  String get label => switch (this) {
    ExportFormat.png => 'PNG',
    ExportFormat.svg => 'SVG',
    ExportFormat.markdown => 'MD',
  };

  String get mimeType => switch (this) {
    ExportFormat.png => 'image/png',
    ExportFormat.svg => 'image/svg+xml',
    ExportFormat.markdown => 'text/markdown',
  };

  bool get isCopiedAsText => this == ExportFormat.markdown;

  String get suffix => switch (this) {
    ExportFormat.png => 'png',
    ExportFormat.svg => 'svg',
    ExportFormat.markdown => 'md',
  };

  String fileNameFor({required Username username, required Year year}) =>
      '${username.value}_${year.value}.$suffix';

  String previewNameFor(Username username) => '${username.value}.$suffix';
}
