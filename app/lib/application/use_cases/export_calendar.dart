import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/repositories/export_repository.dart';

/// Exports a contribution calendar to bytes using the provided options.
///
/// The caller selects which [ExportRepository] implementation to pass
/// (SVG, PNG, Markdown), keeping this use case format-agnostic.
final class ExportCalendar {
  const ExportCalendar({required ExportRepository repository})
    : _repository = repository;

  final ExportRepository _repository;

  /// Returns the exported bytes.
  ///
  /// Throws [ExportFailure] if rendering fails.
  Future<List<int>> call({
    required ContributionCalendar calendar,
    required RenderOptions options,
  }) => _repository.export(calendar: calendar, options: options);
}
