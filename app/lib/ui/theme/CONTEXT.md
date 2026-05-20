# ui/theme/

Single source of truth for all visual constants.

| File | Contents |
|---|---|
| `tokens.dart` | Spacing (4 px scale), border radii, animation durations |
| `app_colors.dart` | Semantic color palette (`background`, `foreground`, `muted`, `accent`, `border`, …) with `light` and `dark` variants |

Never hardcode hex values, `EdgeInsets`, or `Duration` literals anywhere in the widget tree. Always reference these files.
