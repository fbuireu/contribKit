# app/lib/ui/theme

The single source of truth for every visual constant. Never hardcode a hex value, an `EdgeInsets` or a `Duration`
anywhere in the widget tree; reference these files.

That claim is only true because [`main.dart`](../../main.dart) was made to obey it. The `ShadThemeData` colour schemes there (which is
what every `shadcn_ui` primitive actually paints from) held raw hex of their own, so `AppColors.dark.accent` and the
theme's `primary` were two literals nobody kept in step. Both schemes now feed all twelve `AppColors` fields into
thirteen scheme keys: `border` feeds `border` and `input`, `accent`/`accentForeground` feed `primary`/
`primaryForeground` (deliberately, since the scheme's own `accent` is a hover grey and ours is the contribution
green), and the other ten map by name. `AppColors.of(context)` takes only the *brightness* from `ShadTheme`, so the
two would diverge silently again the moment a field stops being wired.

`destructive` was the case that proved it, and it was not alone. It stayed out of the `copyWith`, so the scheme kept
shadcn's Slate red (`#EF4444`) while `AppColors.dark.destructive` said `#7F1D1D`. Widgets picked whichever lookup
they happened to use, drawing two different reds for the same failure, and on the `#09090B` background the token's
value is 1.99:1, below anything readable. `foreground` had the same split (`#F4F4F5` against Slate's `#F8FAFC` in
dark, `#18181B` against `#020817` in light), as did `cardForeground` in the light scheme; those were merely
invisible rather than illegible, which is why they outlived the first fix. Resolving them went the other way:
`destructive` took the colour that was already rendering, because the token's own value failed contrast, while
`foreground` kept the token and the theme adopted it, because both were legible and `AppColors` is meant to be the
source of truth. Every field is wired now, and every widget reads `AppColors.of(context)`.

| File | Contents |
|---|---|
| [`tokens.dart`](./tokens.dart) | `Tokens`: spacing on a 4 px scale (`space1`…`space12`), radii (`radiusSm`…`radiusFull`), font sizes (`textXs`…`text3Xl`), icon sizes (`iconXs`…`iconLg`), animation durations (`durationFast`…`durationSlow` for interaction, plus `durationEntrance`, `durationBreathe`, `durationSpin`, `durationCopiedFeedback`, `cellStaggerStep` and `pulseDotDelays` for the longer set pieces), the customizer's `swatch*` sizes and `swatchGap`, the named one-off dimensions (`dragHandle*`, `formatTileSize`, `tipTileHeight`, `logoSize`, `emojiSize`, `hairlineGap`), `animScaleBegin`, `gridPadding`, `badgePadding`, `filenamePadding` and `pillPadding` |
| [`app_colors.dart`](./app_colors.dart) | Semantic colours (`background`, `foreground`, `muted`, `accent`, `border`, …) with `light` and `dark` variants, plus the two that do not vary by theme (`AppColors.scrim` for a modal barrier and `AppColors.transparent`), and `AppColors.isDark(context)`, the only brightness read outside `main.dart` |
| [`app_text_styles.dart`](./app_text_styles.dart) | `AppTextStyles`: one builder, `mono`, over JetBrains Mono with the zero-slash and `ss01` features enabled |
| [`background_presets.dart`](./background_presets.dart) | The `BackgroundPreset` enum and the colours behind it: the glossary's Background Preset |

**Palettes are not here.** They are loaded at runtime from [`shared/palettes.json`](../../../../shared/palettes.json) through the bundled asset copy, by
`AssetPaletteRepository`, and reached via `palettesProvider`. There is no compile-time palette table to edit: a new
palette is an edit to `shared/palettes.json` plus `pnpm sync:assets`
([ADR 0002](../../../../docs/adr/0002-shared-design-tokens-mirrored-into-the-flutter-bundle.md)).

## `BackgroundPreset`

`system` · `charcoal` · `github` · `navy` · `black`. `label` and `color` are getters on the enum, each an
exhaustive `switch (this)`, so a sixth case is a compile error in both: the same shape `CellSize` already had.
They were two hand-maintained `const Map`s reached as `labels[preset]!`, and that `!` was the crash: a case added
to the enum and not to the map took down the Customizer the first time it rendered.

- **`color` is `null` for `system` on purpose**: that is what makes "system" follow the light/dark toggle instead
  of pinning a shade. **Read it through `colorOr(fallback)`**, never the raw getter: three call sites each
  re-decided the `?? colors.card` / `?? systemColor` fallback, and one of them could have forgotten.
- **`BackgroundPreset.byName` returns `null` for an unknown name**, and the caller pairs it with
  `BackgroundPreset.fallback`. It used to coerce silently to `system`, which is the same answer but hides from the
  reader that a stored value was rejected.
- **Persisted by `name`, under the `backgroundPreset` key, with a legacy fallback to `cardBackground`.** Renaming a
  case is therefore a migration: add the fallback and a test, or every user silently loses their background.

## Gotchas

- **These are Flutter colours; the domain's are not.** `background_presets.dart` imports
  `package:flutter/widgets.dart` for `Color`, while `Palette` in `domain/value_objects/` carries the project's own
  ARGB `Color`. The two are different types with the same name: an import of the wrong one is a confusing error
  message, and the domain one must never appear in `theme/`.
- **`AppTextStyles` builds through `google_fonts`,** so a style is a function call rather than a `const`. It cannot
  be used where a `const` is required, which is why callers take the builder rather than a stored constant.
- **It covers only the monospace face, and the widget tree does not honour the "no inline `TextStyle`" rule.**
  `mono` is the sole builder, and two dozen call sites under `app/lib/ui` still construct a `TextStyle` directly:
  the proportional text mostly rides on `ShadTheme`'s own text theme instead. Treat the rule as the target, not as a
  description of the code, and do not cite this file as proof that no widget does it. (Count it with
  `grep -rn "TextStyle(" app/lib/ui` rather than trusting a number written here.)
- The spacing scale skips values (`space1, 2, 3, 4, 5, 6, 8, 10, 12`); the number is the *step*, not the pixel
  count. `Tokens.space8` is 32 px, not 8.
