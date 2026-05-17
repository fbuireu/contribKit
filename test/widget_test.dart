import 'package:contribkit/domain/repositories/settings_repository.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/main.dart';
import 'package:contribkit/presentation/di/providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// In-memory fake — no Hive, no disk I/O.
final class _FakeSettingsRepository implements SettingsRepository {
  @override
  Future<Username?> getLastUsername() async => null;

  @override
  Future<void> saveLastUsername(Username username) async {}

  @override
  Future<Year?> getLastYear() async => null;

  @override
  Future<void> saveLastYear(Year year) async {}

  @override
  Future<String?> getSavedPaletteName() async => null;

  @override
  Future<void> savePaletteName(String name) async {}

  @override
  Future<CellShape?> getSavedCellShape() async => null;

  @override
  Future<void> saveCellShape(CellShape shape) async {}

  @override
  Future<AppThemeMode?> getThemeMode() async => null;

  @override
  Future<void> saveThemeMode(AppThemeMode mode) async {}
}

void main() {
  testWidgets('App renders without crashing', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          settingsRepositoryProvider
              .overrideWithValue(_FakeSettingsRepository()),
        ],
        child: const ContribKitApp(),
      ),
    );
    await tester.pump();
    expect(find.byType(ContribKitApp), findsOneWidget);
  });
}
