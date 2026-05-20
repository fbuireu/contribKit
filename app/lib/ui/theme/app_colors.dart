import 'package:flutter/widgets.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

/// Semantic color tokens for both light and dark themes.
///
/// Widgets must never reference raw hex values — they consume [AppColors]
/// via [AppColors.of] which resolves based on the current [Brightness].
final class AppColors {
  const AppColors({
    required this.background,
    required this.foreground,
    required this.card,
    required this.cardForeground,
    required this.muted,
    required this.mutedForeground,
    required this.border,
    required this.accent,
    required this.accentForeground,
    required this.destructive,
    required this.destructiveForeground,
    required this.ring,
  });

  final Color background;
  final Color foreground;
  final Color card;
  final Color cardForeground;
  final Color muted;
  final Color mutedForeground;
  final Color border;
  final Color accent;
  final Color accentForeground;
  final Color destructive;
  final Color destructiveForeground;
  final Color ring;

  static const dark = AppColors(
    background: Color(0xFF09090B),
    foreground: Color(0xFFFAFAFA),
    card: Color(0xFF18181B),
    cardForeground: Color(0xFFFAFAFA),
    muted: Color(0xFF27272A),
    mutedForeground: Color(0xFFA1A1AA),
    border: Color(0xFF27272A),
    accent: Color(0xFF3F3F46),
    accentForeground: Color(0xFFFAFAFA),
    destructive: Color(0xFF7F1D1D),
    destructiveForeground: Color(0xFFFAFAFA),
    ring: Color(0xFF52525B),
  );

  static const light = AppColors(
    background: Color(0xFFFFFFFF),
    foreground: Color(0xFF09090B),
    card: Color(0xFFFFFFFF),
    cardForeground: Color(0xFF09090B),
    muted: Color(0xFFF4F4F5),
    mutedForeground: Color(0xFF71717A),
    border: Color(0xFFE4E4E7),
    accent: Color(0xFFF4F4F5),
    accentForeground: Color(0xFF18181B),
    destructive: Color(0xFFEF4444),
    destructiveForeground: Color(0xFFFAFAFA),
    ring: Color(0xFF18181B),
  );

  /// Resolves to dark or light tokens based on the active [ShadTheme] brightness,
  /// which respects the app's forced [ThemeMode] rather than the platform setting.
  static AppColors of(BuildContext context) {
    final brightness = ShadTheme.of(context).brightness;
    return brightness == Brightness.dark ? dark : light;
  }
}
