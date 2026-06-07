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
        retry: null,
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

String _$palettesHash() => r'5c1d8546050d32d64065c0ac6bd3eced1f5d7c15';

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
        retry: null,
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
    r'8cd0577ae742835a2089269eeacc59846e42fc7d';

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
    r'7bb8b16906957922dcc2e88d824e87b06f96cafd';

@ProviderFor(purchaseRepository)
final purchaseRepositoryProvider = PurchaseRepositoryProvider._();

final class PurchaseRepositoryProvider
    extends
        $FunctionalProvider<
          PurchaseRepository,
          PurchaseRepository,
          PurchaseRepository
        >
    with $Provider<PurchaseRepository> {
  PurchaseRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'purchaseRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$purchaseRepositoryHash();

  @$internal
  @override
  $ProviderElement<PurchaseRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  PurchaseRepository create(Ref ref) {
    return purchaseRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(PurchaseRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<PurchaseRepository>(value),
    );
  }
}

String _$purchaseRepositoryHash() =>
    r'be34ccfee76a727e3271ee6b0a8973f5ca5f4e8a';

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

String _$fetchTipProductsHash() => r'48d2b5547b380b425712d1966eec595cc46605a7';

@ProviderFor(purchaseTip)
final purchaseTipProvider = PurchaseTipProvider._();

final class PurchaseTipProvider
    extends $FunctionalProvider<PurchaseTip, PurchaseTip, PurchaseTip>
    with $Provider<PurchaseTip> {
  PurchaseTipProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'purchaseTipProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$purchaseTipHash();

  @$internal
  @override
  $ProviderElement<PurchaseTip> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  PurchaseTip create(Ref ref) {
    return purchaseTip(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(PurchaseTip value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<PurchaseTip>(value),
    );
  }
}

String _$purchaseTipHash() => r'd336b78f2db08c2fb24f59e35f55db51cba794d2';

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
    r'843f61d3ab4c05e8b0efd9ebea7979a3b4f2a364';

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

@ProviderFor(svgExportCalendar)
final svgExportCalendarProvider = SvgExportCalendarProvider._();

final class SvgExportCalendarProvider
    extends $FunctionalProvider<ExportCalendar, ExportCalendar, ExportCalendar>
    with $Provider<ExportCalendar> {
  SvgExportCalendarProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'svgExportCalendarProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$svgExportCalendarHash();

  @$internal
  @override
  $ProviderElement<ExportCalendar> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  ExportCalendar create(Ref ref) {
    return svgExportCalendar(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ExportCalendar value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ExportCalendar>(value),
    );
  }
}

String _$svgExportCalendarHash() => r'6210199ebfb3cd2e19f20d7de32999718a2c5dee';

@ProviderFor(pngExportCalendar)
final pngExportCalendarProvider = PngExportCalendarProvider._();

final class PngExportCalendarProvider
    extends $FunctionalProvider<ExportCalendar, ExportCalendar, ExportCalendar>
    with $Provider<ExportCalendar> {
  PngExportCalendarProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'pngExportCalendarProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$pngExportCalendarHash();

  @$internal
  @override
  $ProviderElement<ExportCalendar> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  ExportCalendar create(Ref ref) {
    return pngExportCalendar(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ExportCalendar value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ExportCalendar>(value),
    );
  }
}

String _$pngExportCalendarHash() => r'7e33e13b6dfa30d6c9a50b608424ca918d4f5b8a';

@ProviderFor(markdownExportCalendar)
final markdownExportCalendarProvider = MarkdownExportCalendarProvider._();

final class MarkdownExportCalendarProvider
    extends $FunctionalProvider<ExportCalendar, ExportCalendar, ExportCalendar>
    with $Provider<ExportCalendar> {
  MarkdownExportCalendarProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'markdownExportCalendarProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$markdownExportCalendarHash();

  @$internal
  @override
  $ProviderElement<ExportCalendar> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  ExportCalendar create(Ref ref) {
    return markdownExportCalendar(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ExportCalendar value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ExportCalendar>(value),
    );
  }
}

String _$markdownExportCalendarHash() =>
    r'22c91609ab2e9462b33b96852dc16dc28929d671';

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

String _$themeModeNotifierHash() => r'62e68a3cf625f24b2313f05c3049b4d4b8430b78';

abstract class _$ThemeModeNotifier extends $Notifier<ThemeMode> {
  ThemeMode build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<ThemeMode, ThemeMode>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<ThemeMode, ThemeMode>,
              ThemeMode,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
