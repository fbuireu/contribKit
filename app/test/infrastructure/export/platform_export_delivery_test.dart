import 'dart:io';

import 'package:contribkit/infrastructure/export/platform_export_delivery.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

const _shareChannel = MethodChannel('dev.fluttercommunity.plus/share');
const _pathProviderChannel = MethodChannel('plugins.flutter.io/path_provider');

void main() {
  final binding = TestWidgetsFlutterBinding.ensureInitialized();
  final messenger = binding.defaultBinaryMessenger;

  late List<MethodCall> shareCalls;
  late List<MethodCall> platformCalls;
  late Directory scratch;

  setUp(() {
    shareCalls = [];
    platformCalls = [];
    scratch = Directory.systemTemp.createTempSync('contribkit_delivery');

    messenger.setMockMethodCallHandler(_shareChannel, (call) async {
      shareCalls.add(call);
      return 'dev.fluttercommunity.plus/share/success';
    });
    messenger.setMockMethodCallHandler(
      _pathProviderChannel,
      (_) async => scratch.path,
    );
    messenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
      platformCalls.add(call);
      return null;
    });
  });

  tearDown(() {
    messenger.setMockMethodCallHandler(_shareChannel, null);
    messenger.setMockMethodCallHandler(_pathProviderChannel, null);
    messenger.setMockMethodCallHandler(SystemChannels.platform, null);
    scratch.deleteSync(recursive: true);
  });

  group('PlatformExportDelivery', () {
    test('hands the clipboard the text, and reaches no share sheet', () async {
      await const PlatformExportDelivery().copyText('![](https://embed)');

      final copy = platformCalls.singleWhere(
        (call) => call.method == 'Clipboard.setData',
      );

      expect((copy.arguments as Map)['text'], '![](https://embed)');
      expect(shareCalls, isEmpty);
    });

    test('writes the bytes to a file the share sheet can name', () async {
      await const PlatformExportDelivery().shareFile(
        bytes: const [1, 2, 3, 4],
        fileName: 'octocat_2024.png',
        mimeType: 'image/png',
      );

      expect(shareCalls, hasLength(1));
      expect(shareCalls.single.method, 'share');

      final arguments = shareCalls.single.arguments as Map;
      final paths = (arguments['paths'] as List).cast<String>();

      expect(paths, hasLength(1));
      expect(
        paths.single,
        endsWith('octocat_2024.png'),
        reason:
            'XFile.name is derived from the path on io and a data-backed XFile '
            'has none, so only fileNameOverrides carries the name we computed',
      );
      expect(File(paths.single).readAsBytesSync(), [1, 2, 3, 4]);
      expect((arguments['mimeTypes'] as List).cast<String>(), ['image/png']);
      expect(
        platformCalls.where((call) => call.method == 'Clipboard.setData'),
        isEmpty,
      );
    });
  });
}
