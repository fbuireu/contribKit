import 'package:contribkit/presentation/di/providers.dart';
import 'package:contribkit/presentation/features/viewer/viewer_screen.dart';
import 'package:contribkit/presentation/theme/tokens.dart';
import 'package:flutter/material.dart' show Material;
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();

  runApp(
    const ProviderScope(
      child: ContribKitApp(),
    ),
  );
}

class ContribKitApp extends ConsumerWidget {
  const ContribKitApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final googleFontTextTheme = ShadTextTheme.fromGoogleFont(GoogleFonts.inter);
    final themeMode = ref.watch(themeModeProvider);

    return ShadApp(
      title: 'ContribKit',
      darkTheme: ShadThemeData(
        brightness: Brightness.dark,
        colorScheme: const ShadSlateColorScheme.dark(),
        radius: BorderRadius.circular(Tokens.radiusMd),
        textTheme: googleFontTextTheme,
      ),
      theme: ShadThemeData(
        brightness: Brightness.light,
        colorScheme: const ShadSlateColorScheme.light(),
        radius: BorderRadius.circular(Tokens.radiusMd),
        textTheme: googleFontTextTheme,
      ),
      themeMode: themeMode,
      home: const Material(
        color: Color(0x00000000),
        child: ViewerScreen(),
      ),
    );
  }
}
