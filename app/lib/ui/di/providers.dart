import 'package:contribkit/application/use_cases/export_calendar.dart';
import 'package:contribkit/application/use_cases/fetch_contributions.dart';
import 'package:contribkit/application/use_cases/fetch_tip_products.dart';
import 'package:contribkit/application/use_cases/invalidate_contribution_cache.dart';
import 'package:contribkit/application/use_cases/give_tip.dart';
import 'package:contribkit/domain/repositories/contribution_repository.dart';
import 'package:contribkit/domain/repositories/export_repository.dart';
import 'package:contribkit/domain/repositories/palette_repository.dart';
import 'package:contribkit/domain/repositories/tip_repository.dart';
import 'package:contribkit/domain/repositories/settings_repository.dart';
import 'package:contribkit/domain/repositories/suggested_username_repository.dart';
import 'package:contribkit/domain/value_objects/export_format.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/infrastructure/assets/asset_palette_repository.dart';
import 'package:contribkit/infrastructure/assets/asset_suggested_username_repository.dart';
import 'package:contribkit/infrastructure/export/markdown_export_repository_impl.dart';
import 'package:contribkit/infrastructure/export/png_export_repository_impl.dart';
import 'package:contribkit/infrastructure/export/svg_export_repository_impl.dart';
import 'package:contribkit/infrastructure/github/contribution_repository_impl.dart';
import 'package:contribkit/infrastructure/persistence/settings_repository_impl.dart';
import 'package:contribkit/infrastructure/tip/revenuecat_tip_repository.dart';
import 'package:flutter/material.dart' show ThemeMode;
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'providers.g.dart';

@riverpod
PaletteRepository paletteRepository(Ref ref) => AssetPaletteRepository();

@riverpod
Future<List<Palette>> palettes(Ref ref) =>
    ref.watch(paletteRepositoryProvider).loadAll();

@riverpod
SuggestedUsernameRepository suggestedUsernameRepository(Ref ref) =>
    AssetSuggestedUsernameRepository();

@riverpod
Future<List<String>> suggestedUsernames(Ref ref) =>
    ref.watch(suggestedUsernameRepositoryProvider).loadAll();

@riverpod
ContributionRepository contributionRepository(Ref ref) =>
    GitHubContributionRepository();

@riverpod
TipRepository tipRepository(Ref ref) => RevenueCatTipRepository();

@riverpod
FetchTipProducts fetchTipProducts(Ref ref) =>
    FetchTipProducts(repository: ref.watch(tipRepositoryProvider));

@riverpod
GiveTip giveTip(Ref ref) =>
    GiveTip(repository: ref.watch(tipRepositoryProvider));

@riverpod
SettingsRepository settingsRepository(Ref ref) => HiveSettingsRepository();

@riverpod
ExportRepository svgExportRepository(Ref ref) => SvgExportRepository();

@riverpod
ExportRepository pngExportRepository(Ref ref) => PngExportRepository();

@riverpod
ExportRepository markdownExportRepository(Ref ref) =>
    const MarkdownExportRepository();

@riverpod
FetchContributions fetchContributions(Ref ref) =>
    FetchContributions(repository: ref.watch(contributionRepositoryProvider));

@riverpod
InvalidateContributionCache invalidateContributionCache(Ref ref) =>
    InvalidateContributionCache(
      repository: ref.watch(contributionRepositoryProvider),
    );

@riverpod
ExportCalendar exportCalendar(Ref ref, ExportFormat format) => ExportCalendar(
  repository: switch (format) {
    ExportFormat.svg => ref.watch(svgExportRepositoryProvider),
    ExportFormat.png => ref.watch(pngExportRepositoryProvider),
    ExportFormat.markdown => ref.watch(markdownExportRepositoryProvider),
  },
);

@riverpod
class ThemeModeNotifier extends _$ThemeModeNotifier {
  @override
  ThemeMode build() {
    _loadSaved();
    return ThemeMode.dark;
  }

  Future<void> _loadSaved() async {
    final settings = await ref.read(settingsRepositoryProvider).load();
    state = _toFlutter(settings.themeMode);
  }

  Future<void> cycle() async {
    final next = state == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    state = next;
    await ref.read(settingsRepositoryProvider).saveThemeMode(_toDomain(next));
  }

  ThemeMode _toFlutter(AppThemeMode m) => switch (m) {
    AppThemeMode.system => ThemeMode.dark,
    AppThemeMode.light => ThemeMode.light,
    AppThemeMode.dark => ThemeMode.dark,
  };

  AppThemeMode _toDomain(ThemeMode m) => switch (m) {
    ThemeMode.light => AppThemeMode.light,
    ThemeMode.dark || ThemeMode.system => AppThemeMode.dark,
  };
}
