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
    noneLight: Color(0xFFEBEDF0),
    low: Color(0xFF0E4429),
    medium: Color(0xFF006D32),
    high: Color(0xFF26A641),
    veryHigh: Color(0xFF39D353),
  );

  static const catppuccinMocha = Palette(
    name: 'Catppuccin',
    none: Color(0xFF1E1E2E),
    noneLight: Color(0xFFEFF1F5),
    low: Color(0xFF313244),
    medium: Color(0xFF89B4FA),
    high: Color(0xFF74C7EC),
    veryHigh: Color(0xFFCBA6F7),
  );

  static const nord = Palette(
    name: 'Nord',
    none: Color(0xFF2E3440),
    noneLight: Color(0xFFECEFF4),
    low: Color(0xFF3B4252),
    medium: Color(0xFF5E81AC),
    high: Color(0xFF81A1C1),
    veryHigh: Color(0xFF88C0D0),
  );

  static const dracula = Palette(
    name: 'Dracula',
    none: Color(0xFF282A36),
    noneLight: Color(0xFFF8F8F2),
    low: Color(0xFF44475A),
    medium: Color(0xFF6272A4),
    high: Color(0xFFBD93F9),
    veryHigh: Color(0xFFFF79C6),
  );

  static const gruvbox = Palette(
    name: 'Gruvbox',
    none: Color(0xFF282828),
    noneLight: Color(0xFFFBF1C7),
    low: Color(0xFF3C3836),
    medium: Color(0xFFD79921),
    high: Color(0xFFD65D0E),
    veryHigh: Color(0xFFCC241D),
  );

  static const sunset = Palette(
    name: 'Sunset',
    none: Color(0xFF1A1A2E),
    noneLight: Color(0xFFFFF0E6),
    low: Color(0xFF4A1942),
    medium: Color(0xFFC9485B),
    high: Color(0xFFED8936),
    veryHigh: Color(0xFFFECB2F),
  );

  static const tokyoNight = Palette(
    name: 'Tokyo Night',
    none: Color(0xFF1A1B26),
    noneLight: Color(0xFFD5D6DB),
    low: Color(0xFF24283B),
    medium: Color(0xFF7AA2F7),
    high: Color(0xFF7DCFFF),
    veryHigh: Color(0xFFBB9AF7),
  );

  static const oneDark = Palette(
    name: 'One Dark',
    none: Color(0xFF282C34),
    noneLight: Color(0xFFF0F0F0),
    low: Color(0xFF3E4451),
    medium: Color(0xFF61AFEF),
    high: Color(0xFF56B6C2),
    veryHigh: Color(0xFFC678DD),
  );

  static const rosePine = Palette(
    name: 'Rosé Pine',
    none: Color(0xFF191724),
    noneLight: Color(0xFFFAF4ED),
    low: Color(0xFF26233A),
    medium: Color(0xFF9CCFD8),
    high: Color(0xFFEB6F92),
    veryHigh: Color(0xFFC4A7E7),
  );

  static const solarized = Palette(
    name: 'Solarized',
    none: Color(0xFF002B36),
    noneLight: Color(0xFFFDF6E3),
    low: Color(0xFF073642),
    medium: Color(0xFF268BD2),
    high: Color(0xFF2AA198),
    veryHigh: Color(0xFF859900),
  );

  static const monokai = Palette(
    name: 'Monokai',
    none: Color(0xFF272822),
    noneLight: Color(0xFFF8F8F0),
    low: Color(0xFF3E3D32),
    medium: Color(0xFFA6E22E),
    high: Color(0xFFE6DB74),
    veryHigh: Color(0xFFF92672),
  );

  static const List<Palette> all = [
    github,
    catppuccinMocha,
    nord,
    dracula,
    gruvbox,
    sunset,
    tokyoNight,
    oneDark,
    rosePine,
    solarized,
    monokai,
  ];

  static Palette byName(String name) =>
      all.firstWhere((p) => p.name == name, orElse: () => github);
}
