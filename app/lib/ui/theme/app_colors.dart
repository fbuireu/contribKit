import 'package:flutter/widgets.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

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
    foreground: Color(0xFFF4F4F5),
    card: Color(0xFF0D0D10),
    cardForeground: Color(0xFFF4F4F5),
    muted: Color(0xFF111114),
    mutedForeground: Color(0xFFA1A1AA),
    border: Color(0xFF1A1A1D),
    accent: Color(0xFF39D353),
    accentForeground: Color(0xFF09090B),
    destructive: Color(0xFFEF4444),
    destructiveForeground: Color(0xFFF8FAFC),
    ring: Color(0xFF39D353),
  );

  static const light = AppColors(
    background: Color(0xFFFAFAFA),
    foreground: Color(0xFF18181B),
    card: Color(0xFFFFFFFF),
    cardForeground: Color(0xFF18181B),
    muted: Color(0xFFF4F4F5),
    mutedForeground: Color(0xFF52525A),
    border: Color(0xFFE4E4E7),
    accent: Color(0xFF1A7F37),
    accentForeground: Color(0xFFFFFFFF),
    destructive: Color(0xFFEF4444),
    destructiveForeground: Color(0xFFF8FAFC),
    ring: Color(0xFF1A7F37),
  );

  static const Color transparent = Color(0x00000000);
  static const Color scrim = Color(0x80000000);

  static bool isDark(BuildContext context) =>
      ShadTheme.of(context).brightness == Brightness.dark;

  static AppColors of(BuildContext context) => isDark(context) ? dark : light;
}
