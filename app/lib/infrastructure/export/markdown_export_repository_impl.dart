import 'dart:convert';

import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/repositories/export_repository.dart';

/// Exports the calendar as a GitHub-compatible Markdown snippet.
///
/// The output embeds an SVG image as a data URI — renders correctly in
/// GitHub README files and most Markdown-aware tools.
final class MarkdownExportRepository implements ExportRepository {
  MarkdownExportRepository({required ExportRepository svgRepository})
    : _svgRepository = svgRepository;

  final ExportRepository _svgRepository;

  @override
  Future<List<int>> export({
    required ContributionCalendar calendar,
    required RenderOptions options,
  }) async {
    try {
      final svgBytes = await _svgRepository.export(
        calendar: calendar,
        options: options,
      );
      final svgBase64 = base64Encode(svgBytes);
      final dataUri = 'data:image/svg+xml;base64,$svgBase64';
      final alt = '${calendar.username} GitHub contributions ${calendar.year}';
      final markdown = '![$alt]($dataUri)\n';
      return utf8.encode(markdown);
    } on ExportFailure {
      rethrow;
    } catch (e) {
      throw ExportFailure(message: 'Markdown export failed: $e');
    }
  }
}
