import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/repositories/export_repository.dart';

final class ExportCalendar {
  const ExportCalendar({required this._repository});

  final ExportRepository _repository;

  Future<List<int>> call({
    required ContributionCalendar calendar,
    required RenderOptions options,
  }) => _repository.export(calendar: calendar, options: options);
}
