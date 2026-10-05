import 'dart:convert';

import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/infrastructure/assets/asset_palette_repository.dart';
import 'package:contribkit/infrastructure/assets/asset_suggested_username_repository.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

const _palettesKey = 'assets/palettes.json';
const _usernamesKey = 'assets/usernames.json';

const _palette = {
  'key': 'github',
  'name': 'GitHub',
  'none': '#161B22',
  'noneLight': '#EBEDF0',
  'low': '#0E4429',
  'medium': '#006D32',
  'high': '#26A641',
  'veryHigh': '#39D353',
};

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;

  void serve(Map<String, String> assets) {
    messenger.setMockMessageHandler('flutter/assets', (message) async {
      final key = utf8.decode(message!.buffer.asUint8List());
      final body = assets[key];
      return body == null ? null : ByteData.sublistView(utf8.encode(body));
    });
  }

  setUp(() {
    rootBundle.evict(_palettesKey);
    rootBundle.evict(_usernamesKey);
  });

  tearDown(() {
    messenger.setMockMessageHandler('flutter/assets', null);
    rootBundle.evict(_palettesKey);
    rootBundle.evict(_usernamesKey);
  });

  Matcher assetFailureFor(String asset) => throwsA(
    isA<AssetFailure>().having((failure) => failure.asset, 'asset', asset),
  );

  group('AssetSuggestedUsernameRepository', () {
    final repository = AssetSuggestedUsernameRepository();

    test('loads the Suggested Usernames a well-formed file lists', () async {
      serve({_usernamesKey: '["torvalds", "gaearon"]'});

      expect(await repository.loadAll(), ['torvalds', 'gaearon']);
    });

    test('fails as an AssetFailure when the file is empty, so the Viewer '
        'says so instead of drawing a label with nothing after it', () async {
      serve({_usernamesKey: '[]'});

      await expectLater(repository.loadAll(), assetFailureFor(_usernamesKey));
    });

    test('fails as an AssetFailure when the file is not JSON', () async {
      serve({_usernamesKey: '["torvalds",'});

      await expectLater(repository.loadAll(), assetFailureFor(_usernamesKey));
    });

    test('fails as an AssetFailure when the file is not a list', () async {
      serve({_usernamesKey: '{"torvalds": true}'});

      await expectLater(repository.loadAll(), assetFailureFor(_usernamesKey));
    });

    test('fails as an AssetFailure when an element is not a string', () async {
      serve({_usernamesKey: '["torvalds", 7]'});

      await expectLater(repository.loadAll(), assetFailureFor(_usernamesKey));
    });

    test('fails as an AssetFailure when the file is missing', () async {
      serve({});

      await expectLater(repository.loadAll(), assetFailureFor(_usernamesKey));
    });
  });

  group('AssetPaletteRepository', () {
    final repository = AssetPaletteRepository();

    test('loads the Palettes a well-formed file lists, in order', () async {
      serve({
        _palettesKey: jsonEncode([
          _palette,
          {..._palette, 'key': 'nord', 'name': 'Nord'},
        ]),
      });

      final palettes = await repository.loadAll();

      expect(palettes.map((palette) => palette.key), ['github', 'nord']);
      expect(palettes.first.veryHigh.argb, 0xFF39D353);
    });

    test('fails as an AssetFailure when the file is empty', () async {
      serve({_palettesKey: '[]'});

      await expectLater(repository.loadAll(), assetFailureFor(_palettesKey));
    });

    test('fails as an AssetFailure when the file is not JSON', () async {
      serve({_palettesKey: '[{'});

      await expectLater(repository.loadAll(), assetFailureFor(_palettesKey));
    });

    test('fails as an AssetFailure when a Palette lacks a field', () async {
      serve({
        _palettesKey: jsonEncode([
          {..._palette}..remove('veryHigh'),
        ]),
      });

      await expectLater(repository.loadAll(), assetFailureFor(_palettesKey));
    });

    test('fails as an AssetFailure when a Palette holds a colour that '
        'is not one', () async {
      serve({
        _palettesKey: jsonEncode([
          {..._palette, 'low': 'green'},
        ]),
      });

      await expectLater(repository.loadAll(), assetFailureFor(_palettesKey));
    });

    test('fails as an AssetFailure when an element is not a Palette', () async {
      serve({_palettesKey: '["github"]'});

      await expectLater(repository.loadAll(), assetFailureFor(_palettesKey));
    });

    test('fails as an AssetFailure when the file is missing', () async {
      serve({});

      await expectLater(repository.loadAll(), assetFailureFor(_palettesKey));
    });
  });
}
