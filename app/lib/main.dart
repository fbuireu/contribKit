import 'package:contribkit/infrastructure/github/contribution_repository_impl.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/presentation/di/providers.dart';
import 'package:contribkit/presentation/features/viewer/viewer_screen.dart';
import 'package:contribkit/presentation/features/widget/calendar_widget_service.dart';
import 'package:contribkit/presentation/theme/palettes.dart';
import 'package:contribkit/presentation/theme/tokens.dart';
import 'package:flutter/material.dart' show Material;
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

    await Hive.initFlutter();

    const settingsBox = 'settings';
    final box = await Hive.openBox<dynamic>(settingsBox);

    final usernameStr = box.get('lastUsername') as String?;
    if (usernameStr == null) return true;

    try {
      final username = Username(usernameStr);
      final yearVal = box.get('lastYear') as int? ?? DateTime.now().year;
      final year = Year(yearVal);
      final paletteName = box.get('paletteName') as String?;
      final cellShapeName = box.get('cellShape') as String?;
      final cellSizeName = box.get('cellSize') as String?;

      final palette = paletteName != null
          ? Palettes.byName(paletteName)
          : Palettes.github;
      final cellShape = cellShapeName != null
          ? CellShape.values.firstWhere(
              (s) => s.name == cellShapeName,
              orElse: () => CellShape.rounded,
            )
          : CellShape.rounded;
      final cellSize = cellSizeName != null
          ? CellSize.values.firstWhere(
              (s) => s.name == cellSizeName,
              orElse: () => CellSize.normal,
            )
          : CellSize.normal;

      final (:calendar, :fromCache) = await GitHubContributionRepository()
          .fetchCalendar(username: username, year: year);

      await CalendarWidgetService.update(
        calendar: calendar,
        palette: palette,
        cellShape: cellShape,
        cellSize: cellSize,
      );
    } catch (_) {
      // Best-effort — returning true so WorkManager doesn't retry.
    }

    return true;
  });
}

Future<void> main() async {
  final widgetsBinding = WidgetsFlutterBinding.ensureInitialized();
  FlutterNativeSplash.preserve(widgetsBinding: widgetsBinding);
  await Hive.initFlutter();

  await Workmanager().initialize(callbackDispatcher);
  await Workmanager().registerPeriodicTask(
    _widgetRefreshTask,
    _widgetRefreshTask,
    frequency: const Duration(hours: 24),
    existingWorkPolicy: ExistingPeriodicWorkPolicy.keep,
  );

  await _initRevenueCat();
  FlutterNativeSplash.remove();
  runApp(const ProviderScope(child: ContribKitApp()));
}

Future<void> _initRevenueCat() async {
  const key = String.fromEnvironment('REVENUECAT_KEY');
  assert(
    key.isNotEmpty,
    'REVENUECAT_KEY is not set. Run with --dart-define-from-file=dart-defines.json',
  );
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
      home: const Material(color: Color(0x00000000), child: ViewerScreen()),
    );
  }
}
