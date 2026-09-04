// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(paletteRepository)
final paletteRepositoryProvider = PaletteRepositoryProvider._();

final class PaletteRepositoryProvider
    extends
        $FunctionalProvider<
          PaletteRepository,
          PaletteRepository,
          PaletteRepository
        >
    with $Provider<PaletteRepository> {
  PaletteRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'paletteRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$paletteRepositoryHash();

  @$internal
  @override
  $ProviderElement<PaletteRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  PaletteRepository create(Ref ref) {
    return paletteRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(PaletteRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<PaletteRepository>(value),
    );
  }
}

String _$paletteRepositoryHash() => r'efdbd82ea469b460b4e98d14cafcd6d4a9330bb7';

@ProviderFor(palettes)
final palettesProvider = PalettesProvider._();

final class PalettesProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Palette>>,
          List<Palette>,
          FutureOr<List<Palette>>
        >
    with $FutureModifier<List<Palette>>, $FutureProvider<List<Palette>> {
  PalettesProvider._()
    : super(
        from: null,
        argument: null,
        retry: _neverRetry,
        name: r'palettesProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$palettesHash();

  @$internal
  @override
  $FutureProviderElement<List<Palette>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<Palette>> create(Ref ref) {
    return palettes(ref);
  }
}

String _$palettesHash() => r'fcc5c51a4cb1352cb89104eadfec933e7e282dcd';

@ProviderFor(suggestedUsernameRepository)
final suggestedUsernameRepositoryProvider =
    SuggestedUsernameRepositoryProvider._();

final class SuggestedUsernameRepositoryProvider
    extends
        $FunctionalProvider<
          SuggestedUsernameRepository,
          SuggestedUsernameRepository,
          SuggestedUsernameRepository
        >
    with $Provider<SuggestedUsernameRepository> {
  SuggestedUsernameRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'suggestedUsernameRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$suggestedUsernameRepositoryHash();

  @$internal
  @override
  $ProviderElement<SuggestedUsernameRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  SuggestedUsernameRepository create(Ref ref) {
    return suggestedUsernameRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(SuggestedUsernameRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<SuggestedUsernameRepository>(value),
    );
  }
}

String _$suggestedUsernameRepositoryHash() =>
    r'581e0e4b9b92c62accc3f753cb157199ea359fbe';

@ProviderFor(suggestedUsernames)
final suggestedUsernamesProvider = SuggestedUsernamesProvider._();

final class SuggestedUsernamesProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<String>>,
          List<String>,
          FutureOr<List<String>>
        >
    with $FutureModifier<List<String>>, $FutureProvider<List<String>> {
  SuggestedUsernamesProvider._()
    : super(
        from: null,
        argument: null,
        retry: _neverRetry,
        name: r'suggestedUsernamesProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$suggestedUsernamesHash();

  @$internal
  @override
  $FutureProviderElement<List<String>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<String>> create(Ref ref) {
    return suggestedUsernames(ref);
  }
}

String _$suggestedUsernamesHash() =>
    r'bdc852aee843de2bdc0a4bd5fabef11c4e2edc50';

@ProviderFor(contributionRepository)
final contributionRepositoryProvider = ContributionRepositoryProvider._();

final class ContributionRepositoryProvider
    extends
        $FunctionalProvider<
          ContributionRepository,
          ContributionRepository,
          ContributionRepository
        >
    with $Provider<ContributionRepository> {
  ContributionRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'contributionRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$contributionRepositoryHash();

  @$internal
  @override
  $ProviderElement<ContributionRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ContributionRepository create(Ref ref) {
    return contributionRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ContributionRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ContributionRepository>(value),
    );
  }
}

String _$contributionRepositoryHash() =>
    r'946511336466063d32ed261f9493122938db6690';

@ProviderFor(tipRepository)
final tipRepositoryProvider = TipRepositoryProvider._();

final class TipRepositoryProvider
    extends $FunctionalProvider<TipRepository, TipRepository, TipRepository>
    with $Provider<TipRepository> {
  TipRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'tipRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$tipRepositoryHash();

  @$internal
  @override
  $ProviderElement<TipRepository> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  TipRepository create(Ref ref) {
    return tipRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(TipRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<TipRepository>(value),
    );
  }
}

String _$tipRepositoryHash() => r'9395e450f5769b7c837515cfed0016b32cca711c';

@ProviderFor(fetchTipProducts)
final fetchTipProductsProvider = FetchTipProductsProvider._();

final class FetchTipProductsProvider
    extends
        $FunctionalProvider<
          FetchTipProducts,
          FetchTipProducts,
          FetchTipProducts
        >
    with $Provider<FetchTipProducts> {
  FetchTipProductsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'fetchTipProductsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$fetchTipProductsHash();

  @$internal
  @override
  $ProviderElement<FetchTipProducts> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  FetchTipProducts create(Ref ref) {
    return fetchTipProducts(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(FetchTipProducts value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<FetchTipProducts>(value),
    );
  }
}

String _$fetchTipProductsHash() => r'0dab6cbc4190a630dc761845c998bf069fa173c2';

@ProviderFor(giveTip)
final giveTipProvider = GiveTipProvider._();

final class GiveTipProvider
    extends $FunctionalProvider<GiveTip, GiveTip, GiveTip>
    with $Provider<GiveTip> {
  GiveTipProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'giveTipProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$giveTipHash();

  @$internal
  @override
  $ProviderElement<GiveTip> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  GiveTip create(Ref ref) {
    return giveTip(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(GiveTip value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<GiveTip>(value),
    );
  }
}

String _$giveTipHash() => r'0b18483dec8ceb777ed1850be2d241b8e4a537c9';

@ProviderFor(settingsRepository)
final settingsRepositoryProvider = SettingsRepositoryProvider._();

final class SettingsRepositoryProvider
    extends
        $FunctionalProvider<
          SettingsRepository,
          SettingsRepository,
          SettingsRepository
        >
    with $Provider<SettingsRepository> {
  SettingsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'settingsRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$settingsRepositoryHash();

  @$internal
  @override
  $ProviderElement<SettingsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  SettingsRepository create(Ref ref) {
    return settingsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(SettingsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<SettingsRepository>(value),
    );
  }
}

String _$settingsRepositoryHash() =>
    r'b8e323aee5b4426edbac0e1ac573ba54c1edefe8';

@ProviderFor(svgExportRepository)
final svgExportRepositoryProvider = SvgExportRepositoryProvider._();

final class SvgExportRepositoryProvider
    extends
        $FunctionalProvider<
          ExportRepository,
          ExportRepository,
          ExportRepository
        >
    with $Provider<ExportRepository> {
  SvgExportRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'svgExportRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$svgExportRepositoryHash();

  @$internal
  @override
  $ProviderElement<ExportRepository> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  ExportRepository create(Ref ref) {
    return svgExportRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ExportRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ExportRepository>(value),
    );
  }
}

String _$svgExportRepositoryHash() =>
    r'5fecd8bd7175094a3e9073ad9f0e29dadde5e92d';

@ProviderFor(pngExportRepository)
final pngExportRepositoryProvider = PngExportRepositoryProvider._();

final class PngExportRepositoryProvider
    extends
        $FunctionalProvider<
          ExportRepository,
          ExportRepository,
          ExportRepository
        >
    with $Provider<ExportRepository> {
  PngExportRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'pngExportRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$pngExportRepositoryHash();

  @$internal
  @override
  $ProviderElement<ExportRepository> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  ExportRepository create(Ref ref) {
    return pngExportRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ExportRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ExportRepository>(value),
    );
  }
}

String _$pngExportRepositoryHash() =>
    r'090ca588ae1e00bca92af364d4a1490daef8551f';

@ProviderFor(markdownExportRepository)
final markdownExportRepositoryProvider = MarkdownExportRepositoryProvider._();

final class MarkdownExportRepositoryProvider
    extends
        $FunctionalProvider<
          ExportRepository,
          ExportRepository,
          ExportRepository
        >
    with $Provider<ExportRepository> {
  MarkdownExportRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'markdownExportRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$markdownExportRepositoryHash();

  @$internal
  @override
  $ProviderElement<ExportRepository> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  ExportRepository create(Ref ref) {
    return markdownExportRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ExportRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ExportRepository>(value),
    );
  }
}

String _$markdownExportRepositoryHash() =>
    r'4b88fd3b84b80a1d1ecd5b4abc2eeb8eb61778d6';

@ProviderFor(fetchContributions)
final fetchContributionsProvider = FetchContributionsProvider._();

final class FetchContributionsProvider
    extends
        $FunctionalProvider<
          FetchContributions,
          FetchContributions,
          FetchContributions
        >
    with $Provider<FetchContributions> {
  FetchContributionsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'fetchContributionsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$fetchContributionsHash();

  @$internal
  @override
  $ProviderElement<FetchContributions> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  FetchContributions create(Ref ref) {
    return fetchContributions(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(FetchContributions value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<FetchContributions>(value),
    );
  }
}

String _$fetchContributionsHash() =>
    r'f2e68a69f79da1b8720ab3cb2b243422e1988349';

@ProviderFor(invalidateContributionCache)
final invalidateContributionCacheProvider =
    InvalidateContributionCacheProvider._();

final class InvalidateContributionCacheProvider
    extends
        $FunctionalProvider<
          InvalidateContributionCache,
          InvalidateContributionCache,
          InvalidateContributionCache
        >
    with $Provider<InvalidateContributionCache> {
  InvalidateContributionCacheProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'invalidateContributionCacheProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$invalidateContributionCacheHash();

  @$internal
  @override
  $ProviderElement<InvalidateContributionCache> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  InvalidateContributionCache create(Ref ref) {
    return invalidateContributionCache(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(InvalidateContributionCache value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<InvalidateContributionCache>(value),
    );
  }
}

String _$invalidateContributionCacheHash() =>
    r'fefa1cbfa88046ad7883441da57380b87c920327';

@ProviderFor(exportCalendar)
final exportCalendarProvider = ExportCalendarFamily._();

final class ExportCalendarProvider
    extends $FunctionalProvider<ExportCalendar, ExportCalendar, ExportCalendar>
    with $Provider<ExportCalendar> {
  ExportCalendarProvider._({
    required ExportCalendarFamily super.from,
    required ExportFormat super.argument,
  }) : super(
         retry: null,
         name: r'exportCalendarProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$exportCalendarHash();

  @override
  String toString() {
    return r'exportCalendarProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<ExportCalendar> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  ExportCalendar create(Ref ref) {
    final argument = this.argument as ExportFormat;
    return exportCalendar(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ExportCalendar value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ExportCalendar>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is ExportCalendarProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$exportCalendarHash() => r'25753cf1a660e48c83c48b9913507399e3e18c20';

final class ExportCalendarFamily extends $Family
    with $FunctionalFamilyOverride<ExportCalendar, ExportFormat> {
  ExportCalendarFamily._()
    : super(
        retry: null,
        name: r'exportCalendarProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  ExportCalendarProvider call(ExportFormat format) =>
      ExportCalendarProvider._(argument: format, from: this);

  @override
  String toString() => r'exportCalendarProvider';
}

@ProviderFor(ThemeModeNotifier)
final themeModeProvider = ThemeModeNotifierProvider._();

final class ThemeModeNotifierProvider
    extends $NotifierProvider<ThemeModeNotifier, ThemeMode> {
  ThemeModeNotifierProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'themeModeProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$themeModeNotifierHash();

  @$internal
  @override
  ThemeModeNotifier create() => ThemeModeNotifier();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ThemeMode value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ThemeMode>(value),
    );
  }
}

String _$themeModeNotifierHash() => r'f94a842fd67667a48bab65cd60430b3c64e2071e';

abstract class _$ThemeModeNotifier extends $Notifier<ThemeMode> {
  ThemeMode build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<ThemeMode, ThemeMode>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<ThemeMode, ThemeMode>,
              ThemeMode,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
