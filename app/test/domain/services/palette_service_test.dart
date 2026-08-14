import 'package:contribkit/domain/services/palette_service.dart';
import 'package:contribkit/domain/value_objects/color.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:flutter_test/flutter_test.dart';

Palette _palette({required String key, required String name}) => Palette(
  key: key,
  name: name,
  none: const Color(0xFF000001),
  noneLight: const Color(0xFF000002),
  low: const Color(0xFF000003),
  medium: const Color(0xFF000004),
  high: const Color(0xFF000005),
  veryHigh: const Color(0xFF000006),
);

final _github = _palette(key: 'github', name: 'GitHub');
final _catppuccin = _palette(key: 'catppuccin', name: 'Catppuccin');
final _all = [_github, _catppuccin];

void main() {
  group('PaletteService.resolve', () {
    test('finds a Palette by its stable key', () {
      expect(
        PaletteService.resolve(palettes: _all, storedKey: 'catppuccin'),
        _catppuccin,
      );
    });

    test(
      'still finds one by its display name, which older installs stored',
      () {
        expect(
          PaletteService.resolve(palettes: _all, storedKey: 'Catppuccin'),
          _catppuccin,
        );
      },
    );

    test('falls back to the first Palette for a key that no longer exists', () {
      expect(
        PaletteService.resolve(palettes: _all, storedKey: 'gone'),
        _github,
      );
    });

    test('uses the first Palette when nothing was ever stored', () {
      expect(PaletteService.resolve(palettes: _all, storedKey: null), _github);
    });

    test('returns null rather than throwing when there are no Palettes', () {
      expect(
        PaletteService.resolve(palettes: const [], storedKey: 'github'),
        isNull,
      );
      expect(
        PaletteService.resolve(palettes: const [], storedKey: null),
        isNull,
      );
    });

    test('prefers a key match over a name match', () {
      final confusing = _palette(key: 'other', name: 'github');

      expect(
        PaletteService.resolve(
          palettes: [confusing, _github],
          storedKey: 'github',
        ),
        confusing,
      );
    });
  });
}
