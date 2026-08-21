import 'package:contribkit/infrastructure/persistence/settings_repository_impl.dart';
import 'package:contribkit/infrastructure/assets/asset_palette_repository.dart';
import 'package:contribkit/infrastructure/github/contribution_repository_impl.dart';
import 'package:contribkit/ui/di/providers.dart';
import 'package:contribkit/ui/features/viewer/viewer_screen.dart';
import 'package:contribkit/ui/features/widget/home_screen_widget_refresh.dart';
import 'package:contribkit/ui/theme/app_colors.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:flutter/material.dart' show Material, ThemeMode;
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_native_splash/flutter_native_splash.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:shadcn_ui/shadcn_ui.dart';
import 'package:workmanager/workmanager.dart';

const _widgetRefreshTask = 'contribkit.widgetRefresh';

@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((task, _) async {
    if (task != _widgetRefreshTask) return true;

    WidgetsFlutterBinding.ensureInitialized();

    try {
      await Hive.initFlutter();

      await HomeScreenWidgetRefresh(
        settings: HiveSettingsRepository(),
        palettes: AssetPaletteRepository(),
        contributions: GitHubContributionRepository(),
      )();
    } catch (_) {
      return false;
    }

    return true;
  });
}

Future<void> main() async {
  final widgetsBinding = WidgetsFlutterBinding.ensureInitialized();
  FlutterNativeSplash.preserve(widgetsBinding: widgetsBinding);
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  await Hive.initFlutter();

  await _bestEffort(_dropLegacyCaches);
  await _bestEffort(_scheduleWidgetRefresh);
  await _bestEffort(_initRevenueCat);

  runApp(const ProviderScope(child: ContribKitApp()));
}

Future<void> _bestEffort(Future<void> Function() step) async {
  try {
    await step();
  } catch (_) {}
}

Future<void> _dropLegacyCaches() async {
  for (final box in legacyContributionCacheBoxNames) {
    await Hive.deleteBoxFromDisk(box);
  }
}

Future<void> _scheduleWidgetRefresh() async {
  await Workmanager().initialize(callbackDispatcher);
  await Workmanager().registerPeriodicTask(
    _widgetRefreshTask,
    _widgetRefreshTask,
    frequency: const Duration(hours: 24),
    existingWorkPolicy: ExistingPeriodicWorkPolicy.keep,
  );
}

Future<void> _initRevenueCat() async {
  const key = String.fromEnvironment('REVENUECAT_KEY');
  if (key.isEmpty) return;
  await Purchases.setLogLevel(LogLevel.error);
  await Purchases.configure(PurchasesConfiguration(key));
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
        colorScheme: const ShadSlateColorScheme.dark().copyWith(
          background: AppColors.dark.background,
          foreground: AppColors.dark.foreground,
          card: AppColors.dark.card,
          cardForeground: AppColors.dark.cardForeground,
          muted: AppColors.dark.muted,
          mutedForeground: AppColors.dark.mutedForeground,
          border: AppColors.dark.border,
          input: AppColors.dark.border,
          primary: AppColors.dark.accent,
          primaryForeground: AppColors.dark.accentForeground,
          destructive: AppColors.dark.destructive,
          destructiveForeground: AppColors.dark.destructiveForeground,
          ring: AppColors.dark.ring,
        ),
        radius: BorderRadius.circular(Tokens.radiusMd),
        textTheme: googleFontTextTheme,
      ),
      theme: ShadThemeData(
        brightness: Brightness.light,
        colorScheme: const ShadSlateColorScheme.light().copyWith(
          background: AppColors.light.background,
          foreground: AppColors.light.foreground,
          card: AppColors.light.card,
          cardForeground: AppColors.light.cardForeground,
          muted: AppColors.light.muted,
          mutedForeground: AppColors.light.mutedForeground,
          border: AppColors.light.border,
          input: AppColors.light.border,
          primary: AppColors.light.accent,
          primaryForeground: AppColors.light.accentForeground,
          destructive: AppColors.light.destructive,
          destructiveForeground: AppColors.light.destructiveForeground,
          ring: AppColors.light.ring,
        ),
        radius: BorderRadius.circular(Tokens.radiusMd),
        textTheme: googleFontTextTheme,
      ),
      themeMode: themeMode,
      home: AnnotatedRegion<SystemUiOverlayStyle>(
        value:
            (themeMode == ThemeMode.light
                    ? SystemUiOverlayStyle.dark
                    : SystemUiOverlayStyle.light)
                .copyWith(
                  statusBarColor: AppColors.transparent,
                  systemNavigationBarColor: AppColors.transparent,
                  systemNavigationBarContrastEnforced: false,
                ),
        child: const Material(
          color: AppColors.transparent,
          child: ViewerScreen(),
        ),
      ),
    );
  }
}
