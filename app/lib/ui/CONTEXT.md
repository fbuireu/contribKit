# ui/

Flutter widgets and Riverpod providers. The only layer that knows about Flutter and Riverpod.

## Rules
- No business logic in widgets. If `build` has more than trivial conditionals, extract to a notifier.
- Widgets are dumb: `ref.watch` for state, `ref.read(notifier).method()` to act.
- Never import `shadcn_ui` directly in feature widgets — use `AppXxx` wrappers instead.
- Never use `MaterialApp`; the root is `ShadApp`.
- Never hardcode colors or spacing; use `Tokens` and `AppColors`.

## Subdirectories

| Directory | Contents |
|---|---|
| `di/` | All dependency wiring — the only place that constructs infrastructure objects |
| `theme/` | `tokens.dart` (spacing, radii, durations), `app_colors.dart` (semantic colors) |
| `widgets/` | Shared `AppXxx` wrappers over `shadcn_ui` primitives |
| `features/viewer/` | Contribution calendar viewer screen and notifier |
| `features/customizer/` | Palette, shape, and background customization UI |
| `features/export/` | Export format selection and share flow |
| `features/tip/` | Tip jar (RevenueCat one-time purchases) |
| `features/widget/` | Home-screen widget data sync and configuration |
