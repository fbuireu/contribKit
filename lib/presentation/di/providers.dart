import 'package:contribkit/application/use_cases/export_calendar.dart';
import 'package:contribkit/application/use_cases/fetch_contributions.dart';
import 'package:contribkit/domain/repositories/contribution_repository.dart';
import 'package:contribkit/domain/repositories/export_repository.dart';
import 'package:contribkit/domain/repositories/settings_repository.dart';
import 'package:contribkit/infrastructure/export/markdown_export_repository_impl.dart';
import 'package:contribkit/infrastructure/export/png_export_repository_impl.dart';
import 'package:contribkit/infrastructure/export/svg_export_repository_impl.dart';
import 'package:contribkit/infrastructure/github/contribution_repository_impl.dart';
import 'package:contribkit/infrastructure/persistence/settings_repository_impl.dart';
import 'package:flutter/material.dart' show ThemeMode;
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'providers.g.dart';

// ---------------------------------------------------------------------------
// Infrastructure
// ---------------------------------------------------------------------------

@riverpod
ContributionRepository contributionRepository(Ref ref) =>
    GitHubContributionRepository();

@riverpod
SettingsRepository settingsRepository(Ref ref) => HiveSettingsRepository();

@riverpod
ExportRepository svgExportRepository(Ref ref) => SvgExportRepository();

@riverpod
ExportRepository pngExportRepository(Ref ref) => PngExportRepository();

@riverpod
ExportRepository markdownExportRepository(Ref ref) => MarkdownExportRepository(
  svgRepository: ref.watch(svgExportRepositoryProvider),
);

// ---------------------------------------------------------------------------
// Use cases
// ---------------------------------------------------------------------------

@riverpod
FetchContributions fetchContributions(Ref ref) =>
    FetchContributions(repository: ref.watch(contributionRepositoryProvider));

@riverpod
ExportCalendar svgExportCalendar(Ref ref) =>
    ExportCalendar(repository: ref.watch(svgExportRepositoryProvider));

@riverpod
ExportCalendar pngExportCalendar(Ref ref) =>
    ExportCalendar(repository: ref.watch(pngExportRepositoryProvider));

@riverpod
ExportCalendar markdownExportCalendar(Ref ref) =>
    ExportCalendar(repository: ref.watch(markdownExportRepositoryProvider));

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

/// Persists and exposes the user's theme preference.
///
/// Starts with [ThemeMode.system] immediately, then overrides with the saved
/// value once Hive resolves — no loading state needed.
@riverpod
class ThemeModeNotifier extends _$ThemeModeNotifier {
  @override
  ThemeMode build() {
    _loadSaved();
    return ThemeMode.system;
  }

  Future<void> _loadSaved() async {
    final saved = await ref.read(settingsRepositoryProvider).getThemeMode();
    if (saved != null) state = _toFlutter(saved);
  }

  /// Cycles system → light → dark → system.
  Future<void> cycle() async {
    final next = switch (state) {
      ThemeMode.system => ThemeMode.light,
      ThemeMode.light => ThemeMode.dark,
      ThemeMode.dark => ThemeMode.system,
    };
    state = next;
    await ref.read(settingsRepositoryProvider).saveThemeMode(_toDomain(next));
  }

  ThemeMode _toFlutter(AppThemeMode m) => switch (m) {
    AppThemeMode.system => ThemeMode.system,
    AppThemeMode.light => ThemeMode.light,
    AppThemeMode.dark => ThemeMode.dark,
  };

  AppThemeMode _toDomain(ThemeMode m) => switch (m) {
    ThemeMode.system => AppThemeMode.system,
    ThemeMode.light => AppThemeMode.light,
    ThemeMode.dark => AppThemeMode.dark,
  };
}
