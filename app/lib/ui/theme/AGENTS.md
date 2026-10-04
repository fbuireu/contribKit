# app/lib/ui/theme

The single source of truth for every visual constant: the widget tree takes its colours, spacings, sizes and
durations from these files, and builds an `EdgeInsets` from `Tokens`.

[`main.dart`](../../main.dart) reads them too. Its `ShadThemeData` colour schemes, which every `shadcn_ui` primitive
actually paints from, feed all twelve `AppColors` fields into thirteen scheme keys: `border` feeds `border` and
`input`, `accent`/`accentForeground` feed `primary`/`primaryForeground` (deliberately, since the scheme's own
`accent` is a hover grey and ours is the contribution green), and the other ten map by name. `AppColors.of(context)`
takes only the *brightness* from `ShadTheme`, so the two diverge silently the moment a field stops being wired: a
primitive that paints from the scheme and a widget that reads `AppColors` draw two colours for one purpose. Every
field is wired, and every widget reads its theme colours through `AppColors`.

| File | Contents |
|---|---|
| [`tokens.dart`](./tokens.dart) | `Tokens`: spacing on a 4 px scale (`space1`…`space12`), radii (`radiusSm`…`radiusFull`), font sizes (`textXs`…`text3Xl`), icon sizes (`iconXs`…`iconLg`), `minTapTarget`, animation durations (`durationFast`…`durationSlow` for interaction, plus `durationEntrance`, `durationBreathe`, `durationSpin`, `durationCopiedFeedback`, `cellStaggerStep` and `pulseDotDelays` for the longer set pieces), the customizer's `swatch*` sizes and `swatchGap`, the `tileBorder*` widths of the Export and Tip tiles, the named one-off dimensions (`dragHandle*`, `formatTileSize`, `tipTileHeight`, `logoSize`, `emojiSize`, `hairlineGap`, `pillGap`, `pulseDotSize*`, `checkerSize`), `animScaleBegin`, `gridPadding`, `badgePadding`, `filenamePadding` and `pillPadding` |
| [`app_colors.dart`](./app_colors.dart) | Semantic colours (`background`, `foreground`, `muted`, `accent`, `border`, …) with `light` and `dark` variants, plus the two that do not vary by theme (`AppColors.scrim` for a modal barrier and `AppColors.transparent`), and `AppColors.isDark(context)`, the only brightness read outside `main.dart` |
| [`app_text_styles.dart`](./app_text_styles.dart) | `AppTextStyles`: one builder, `mono`, over JetBrains Mono with the zero-slash and `ss01` features enabled |
| [`background_presets.dart`](./background_presets.dart) | `BackgroundPresetPainting`, which paints the glossary's Background Preset as a Flutter colour, and a re-export of the domain's `BackgroundPreset` enum |

**Palettes are not here.** They are loaded at runtime from [`shared/palettes.json`](../../../../shared/palettes.json) through the bundled asset copy, by
`AssetPaletteRepository`, and reached via `palettesProvider`. There is no compile-time palette table to edit: a new
palette is an edit to `shared/palettes.json` plus `pnpm sync:assets`
([ADR 0002](../../../../docs/adr/0002-shared-design-tokens-mirrored-into-the-flutter-bundle.md)).

## `BackgroundPreset`

`system` · `charcoal` · `github` · `navy` · `black`. The enum, its `label` and its `color` live in
[`background_preset.dart`](../../domain/value_objects/background_preset.dart) in the domain, each getter an
exhaustive `switch (this)`, so a sixth case is a compile error in both; this folder adds only the painting.

- **`color` is `null` for `system` on purpose**: that is what makes "system" follow the light/dark toggle instead
  of pinning a shade, and `colorOr(fallback)` is where the `?? colors.card` fallback is decided.
- **`BackgroundPreset.byName` returns `null` for an unknown name**, so a rejected stored value is visible where
  `ViewerNotifier` pairs it with `BackgroundPreset.fallback`.
- **Persisted by `name`, under the `backgroundPreset` key, with a legacy fallback to `cardBackground`.** Renaming a
  case is therefore a migration: add the fallback and a test, or every person silently loses their Background.

## Gotchas

- **Two types are called `Color`.** `background_presets.dart` holds both: the domain's ARGB `Color` that
  `BackgroundPreset.color` returns, and Flutter's, imported `as flutter` so the two cannot be confused. The domain
  one converts where it is painted, through `.argb`.
- **`AppTextStyles` builds through `google_fonts`,** so a style is a function call rather than a `const`. It cannot
  be used where a `const` is required, which is why callers take the builder rather than a stored constant.
- **`mono` is the only builder.** The proportional text rides on `ShadTheme`'s own text theme.
- The spacing scale skips values (`space1, 2, 3, 4, 5, 6, 8, 10, 12`); the number is the *step*, not the pixel
  count. `Tokens.space8` is 32 px, not 8.
