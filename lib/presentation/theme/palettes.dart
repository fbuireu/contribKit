import 'package:contribkit/domain/value_objects/color.dart';
import 'package:contribkit/domain/value_objects/palette.dart';

/// Predefined contribution palettes.
///
/// [all] is the canonical list shown in the palette picker. The first entry
/// is the default shown on first launch.
abstract final class Palettes {
  static const github = Palette(
    name: 'GitHub',
    none: Color(0xFF161B22),
    low: Color(0xFF0E4429),
    medium: Color(0xFF006D32),
    high: Color(0xFF26A641),
    veryHigh: Color(0xFF39D353),
  );

  static const catppuccinMocha = Palette(
    name: 'Catppuccin',
    none: Color(0xFF1E1E2E),
    low: Color(0xFF313244),
    medium: Color(0xFF89B4FA),
    high: Color(0xFF74C7EC),
    veryHigh: Color(0xFFCBA6F7),
  );

  static const nord = Palette(
    name: 'Nord',
    none: Color(0xFF2E3440),
    low: Color(0xFF3B4252),
    medium: Color(0xFF5E81AC),
    high: Color(0xFF81A1C1),
    veryHigh: Color(0xFF88C0D0),
  );

  static const dracula = Palette(
    name: 'Dracula',
    none: Color(0xFF282A36),
    low: Color(0xFF44475A),
    medium: Color(0xFF6272A4),
    high: Color(0xFFBD93F9),
    veryHigh: Color(0xFFFF79C6),
  );

  static const gruvbox = Palette(
    name: 'Gruvbox',
    none: Color(0xFF282828),
    low: Color(0xFF3C3836),
    medium: Color(0xFFD79921),
    high: Color(0xFFD65D0E),
    veryHigh: Color(0xFFCC241D),
  );

  static const sunset = Palette(
    name: 'Sunset',
    none: Color(0xFF1A1A2E),
    low: Color(0xFF4A1942),
    medium: Color(0xFFC9485B),
    high: Color(0xFFED8936),
    veryHigh: Color(0xFFFECB2F),
  );

  static const List<Palette> all = [
    github,
    catppuccinMocha,
    nord,
    dracula,
    gruvbox,
    sunset,
  ];

  static Palette byName(String name) =>
      all.firstWhere((p) => p.name == name, orElse: () => github);
}
