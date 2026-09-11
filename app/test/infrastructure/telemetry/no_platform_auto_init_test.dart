import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

const _androidManifest = 'android/app/src/main/AndroidManifest.xml';
const _infoPlist = 'ios/Runner/Info.plist';

const _platformConfiguredKeys = [
  'com.posthog.posthog.PROJECT_TOKEN',
  'com.posthog.posthog.API_KEY',
  'com.posthog.posthog.POSTHOG_HOST',
  'com.posthog.posthog.TRACK_APPLICATION_LIFECYCLE_EVENTS',
  'com.posthog.posthog.CAPTURE_APPLICATION_LIFECYCLE_EVENTS',
  'com.posthog.posthog.DEBUG',
];

String _read(String path) {
  final file = File(path);
  expect(file.existsSync(), isTrue, reason: path);
  return file.readAsStringSync();
}

void main() {
  group('PostHog never configures itself from the platform', () {
    test('disables AUTO_INIT on both platforms', () {
      expect(
        _read(_androidManifest),
        contains('android:name="com.posthog.posthog.AUTO_INIT"'),
      );
      expect(
        RegExp(
          r'android:name="com\.posthog\.posthog\.AUTO_INIT"\s*\n?\s*android:value="false"',
        ).hasMatch(_read(_androidManifest)),
        isTrue,
        reason: 'AUTO_INIT must be false, not merely present',
      );
      expect(
        RegExp(r'<key>com\.posthog\.posthog\.AUTO_INIT</key>\s*<false/>')
            .hasMatch(_read(_infoPlist)),
        isTrue,
        reason: _infoPlist,
      );
    });

    test('declares none of the keys the vendor docs tell you to paste', () {
      final android = _read(_androidManifest);
      final ios = _read(_infoPlist);

      final declared = _platformConfiguredKeys
          .where((key) => android.contains(key) || ios.contains(key))
          .toList();

      expect(declared, isEmpty);
    });
  });
}
