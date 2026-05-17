import 'package:contribkit/application/use_cases/export_calendar.dart';
import 'package:contribkit/application/use_cases/fetch_contributions.dart';
import 'package:contribkit/domain/repositories/contribution_repository.dart';
import 'package:contribkit/domain/repositories/export_repository.dart';
import 'package:contribkit/domain/repositories/settings_repository.dart';
import 'package:contribkit/infrastructure/export/markdown_export_repository_impl.dart';
import 'package:contribkit/infrastructure/export/png_export_repository_impl.dart';
import 'package:contribkit/infrastructure/export/svg_export_repository_impl.dart';
import 'package:contribkit/infrastructure/github/contribution_repository_impl.dart';
import 'package:contribkit/infrastructure/github/graphql_client.dart';
import 'package:contribkit/infrastructure/persistence/settings_repository_impl.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'providers.g.dart';

// ---------------------------------------------------------------------------
// Infrastructure
// ---------------------------------------------------------------------------

@riverpod
GraphQLClient graphQLClient(Ref ref) {
  final client = GraphQLClient();
  ref.onDispose(client.close);
  return client;
}

@riverpod
ContributionRepository contributionRepository(Ref ref) =>
    GitHubContributionRepository(
      graphQLClient: ref.watch(graphQLClientProvider),
    );

@riverpod
SettingsRepository settingsRepository(Ref ref) => HiveSettingsRepository();

@riverpod
ExportRepository svgExportRepository(Ref ref) => SvgExportRepository();

@riverpod
ExportRepository pngExportRepository(Ref ref) => PngExportRepository();

@riverpod
ExportRepository markdownExportRepository(Ref ref) =>
    MarkdownExportRepository(
      svgRepository: ref.watch(svgExportRepositoryProvider),
    );

// ---------------------------------------------------------------------------
// Use cases
// ---------------------------------------------------------------------------

@riverpod
FetchContributions fetchContributions(Ref ref) => FetchContributions(
      repository: ref.watch(contributionRepositoryProvider),
    );

@riverpod
ExportCalendar svgExportCalendar(Ref ref) => ExportCalendar(
      repository: ref.watch(svgExportRepositoryProvider),
    );

@riverpod
ExportCalendar pngExportCalendar(Ref ref) => ExportCalendar(
      repository: ref.watch(pngExportRepositoryProvider),
    );

@riverpod
ExportCalendar markdownExportCalendar(Ref ref) => ExportCalendar(
      repository: ref.watch(markdownExportRepositoryProvider),
    );
