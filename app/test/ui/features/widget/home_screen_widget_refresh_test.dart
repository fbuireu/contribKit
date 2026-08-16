import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/repositories/contribution_repository.dart';
import 'package:contribkit/domain/repositories/palette_repository.dart';
import 'package:contribkit/domain/repositories/settings_repository.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/color.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/ui/features/widget/home_screen_widget_refresh.dart';
import 'package:flutter_test/flutter_test.dart';

const _github = Palette(
  key: 'github',
  name: 'GitHub',
  none: Color(0xFF000001),
  noneLight: Color(0xFF000002),
  low: Color(0xFF000003),
  medium: Color(0xFF000004),
  high: Color(0xFF000005),
  veryHigh: Color(0xFF000006),
);

const _dracula = Palette(
  key: 'dracula',
  name: 'Dracula',
  none: Color(0xFF100001),
  noneLight: Color(0xFF100002),
  low: Color(0xFF100003),
  medium: Color(0xFF100004),
  high: Color(0xFF100005),
  veryHigh: Color(0xFF100006),
);

final class _FakeSettingsRepository implements SettingsRepository {
  _FakeSettingsRepository({
    this.username,
    this.year,
    this.paletteKey,
    this.cellShape,
  });

  final Username? username;
  final Year? year;
  final String? paletteKey;
  final CellShape? cellShape;

  @override
  Future<Username?> getLastUsername() async => username;

  @override
  Future<Year?> getLastYear() async => year;

  @override
  Future<String?> getSavedPaletteKey() async => paletteKey;

  @override
  Future<CellShape?> getSavedCellShape() async => cellShape;

  @override
  Future<CellSize?> getSavedCellSize() async => null;

  @override
  Future<String?> getSavedBackgroundPreset() async => null;

  @override
  Future<AppThemeMode?> getThemeMode() async => null;

  @override
  Future<void> saveLastUsername(Username username) async {}

  @override
  Future<void> saveLastYear(Year year) async {}

  @override
  Future<void> savePaletteKey(String key) async {}

  @override
  Future<void> saveCellShape(CellShape shape) async {}

  @override
  Future<void> saveCellSize(CellSize size) async {}

  @override
  Future<void> saveBackgroundPreset(String presetName) async {}

  @override
  Future<void> saveThemeMode(AppThemeMode mode) async {}
}

final class _FakePaletteRepository implements PaletteRepository {
  _FakePaletteRepository(this._palettes);

  final List<Palette> _palettes;

  @override
  Future<List<Palette>> loadAll() async => _palettes;
}

final class _FakeContributionRepository implements ContributionRepository {
  _FakeContributionRepository(this._calendar);

  final ContributionCalendar _calendar;

  Username? requestedUsername;
  Year? requestedYear;
  var fetchCount = 0;

  @override
  Future<({ContributionCalendar calendar, bool fromCache})> fetchCalendar({
    required Username username,
    required Year year,
  }) async {
    fetchCount++;
    requestedUsername = username;
    requestedYear = year;
    return (calendar: _calendar, fromCache: false);
  }

  @override
  Future<void> invalidateCache(Username username) async {}
}

final class _RecordingWriter {
  ContributionCalendar? calendar;
  Palette? palette;
  CellShape? cellShape;
  var calls = 0;

  Future<void> write({
    required ContributionCalendar calendar,
    required Palette palette,
    required CellShape cellShape,
  }) async {
    calls++;
    this.calendar = calendar;
    this.palette = palette;
    this.cellShape = cellShape;
  }
}

void main() {
  final username = Username('octocat');
  final calendar = ContributionCalendar(
    username: username,
    year: Year(2024),
    weeks: const [],
    totalContributions: 7,
  );

  HomeScreenWidgetRefresh subject({
    required _FakeSettingsRepository settings,
    required _FakeContributionRepository contributions,
    required _RecordingWriter writer,
    List<Palette> palettes = const [_github, _dracula],
  }) => HomeScreenWidgetRefresh(
    settings: settings,
    palettes: _FakePaletteRepository(palettes),
    contributions: contributions,
    write: writer.write,
  );

  group('HomeScreenWidgetRefresh', () {
    test('writes the stored username, Year, Palette and Cell Shape', () async {
      final contributions = _FakeContributionRepository(calendar);
      final writer = _RecordingWriter();

      await subject(
        settings: _FakeSettingsRepository(
          username: username,
          year: Year(2024),
          paletteKey: 'dracula',
          cellShape: CellShape.circle,
        ),
        contributions: contributions,
        writer: writer,
      )();

      expect(contributions.requestedUsername, username);
      expect(contributions.requestedYear, Year(2024));
      expect(writer.calendar, calendar);
      expect(writer.palette, _dracula);
      expect(writer.cellShape, CellShape.circle);
    });

    test('falls back to the current Year when none is stored', () async {
      final contributions = _FakeContributionRepository(calendar);
      final writer = _RecordingWriter();

      await subject(
        settings: _FakeSettingsRepository(username: username),
        contributions: contributions,
        writer: writer,
      )();

      expect(contributions.requestedYear, Year.current);
    });

    test('falls back to the default Cell Shape when none is stored', () async {
      final writer = _RecordingWriter();

      await subject(
        settings: _FakeSettingsRepository(username: username),
        contributions: _FakeContributionRepository(calendar),
        writer: writer,
      )();

      expect(writer.cellShape, CellShape.fallback);
    });

    test('resolves a Palette stored under its name, not its key', () async {
      final writer = _RecordingWriter();

      await subject(
        settings: _FakeSettingsRepository(
          username: username,
          paletteKey: 'Dracula',
        ),
        contributions: _FakeContributionRepository(calendar),
        writer: writer,
      )();

      expect(writer.palette, _dracula);
    });

    test('does not fetch when no username has been stored', () async {
      final contributions = _FakeContributionRepository(calendar);
      final writer = _RecordingWriter();

      await subject(
        settings: _FakeSettingsRepository(),
        contributions: contributions,
        writer: writer,
      )();

      expect(contributions.fetchCount, 0);
      expect(writer.calls, 0);
    });

    test('does not write when no Palette can be resolved', () async {
      final contributions = _FakeContributionRepository(calendar);
      final writer = _RecordingWriter();

      await subject(
        settings: _FakeSettingsRepository(username: username),
        contributions: contributions,
        writer: writer,
        palettes: const [],
      )();

      expect(contributions.fetchCount, 0);
      expect(writer.calls, 0);
    });
  });
}
