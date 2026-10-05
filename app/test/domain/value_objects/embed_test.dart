import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/embed.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Embed.urlFor', () {
    test('builds the Embed URL from a Username', () {
      expect(
        Embed.urlFor(username: Username('torvalds')),
        'https://contribkit.app/user/torvalds.svg',
      );
    });

    test('carries a Palette and a Cell Shape that differ from the defaults', () {
      expect(
        Embed.urlFor(
          username: Username('torvalds'),
          paletteKey: 'catppuccin',
          shape: CellShape.hex,
        ),
        'https://contribkit.app/user/torvalds.svg?palette=catppuccin&shape=hex',
      );
    });

    test('leaves out a Palette and a Cell Shape that are the defaults', () {
      expect(
        Embed.urlFor(
          username: Username('torvalds'),
          paletteKey: Embed.defaultPaletteKey,
          shape: Embed.defaultShape,
        ),
        'https://contribkit.app/user/torvalds.svg',
      );
    });
  });
}
