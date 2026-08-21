import 'dart:convert';

import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/repositories/export_repository.dart';
import 'package:contribkit/domain/value_objects/embed.dart';

final class MarkdownExportRepository implements ExportRepository {
  const MarkdownExportRepository();

  @override
  Future<List<int>> export({
    required ContributionCalendar calendar,
    required RenderOptions options,
  }) async {
    try {
      final url = Embed.urlFor(
        username: calendar.username.value,
        paletteKey: options.palette.key,
        shape: options.shape,
      );
      final alt = '${calendar.username} GitHub contributions';

      return utf8.encode('![$alt]($url)\n');
    } catch (e) {
      throw ExportFailure(message: 'Markdown export failed: $e');
    }
  }
}
