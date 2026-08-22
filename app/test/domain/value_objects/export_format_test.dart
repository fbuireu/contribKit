import 'package:contribkit/domain/value_objects/export_format.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final username = Username('octocat');
  final year = Year(2024);

  group('ExportFormat', () {
    test('names a saved Export after the user and the Year', () {
      expect(
        ExportFormat.png.fileNameFor(username: username, year: year),
        'octocat_2024.png',
      );
      expect(
        ExportFormat.svg.fileNameFor(username: username, year: year),
        'octocat_2024.svg',
      );
      expect(
        ExportFormat.markdown.fileNameFor(username: username, year: year),
        'octocat_2024.md',
      );
    });

    test('carries one MIME type per Export Format', () {
      expect(ExportFormat.png.mimeType, 'image/png');
      expect(ExportFormat.svg.mimeType, 'image/svg+xml');
      expect(ExportFormat.markdown.mimeType, 'text/markdown');
    });

    test('marks Markdown as the one Export Format copied as text', () {
      expect(ExportFormat.markdown.isCopiedAsText, isTrue);
      expect(ExportFormat.png.isCopiedAsText, isFalse);
      expect(ExportFormat.svg.isCopiedAsText, isFalse);
    });

    test('previews a name without the Year', () {
      expect(ExportFormat.svg.previewNameFor(username), 'octocat.svg');
    });

    test('gives every Export Format a label and a suffix', () {
      for (final format in ExportFormat.values) {
        expect(format.label, isNotEmpty);
        expect(format.suffix, isNotEmpty);
      }
    });
  });
}
