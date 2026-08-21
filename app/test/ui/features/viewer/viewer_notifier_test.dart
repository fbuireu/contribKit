import 'dart:async';

import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/entities/contribution_day.dart';
import 'package:contribkit/domain/entities/contribution_week.dart';
import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/repositories/contribution_repository.dart';
import 'package:contribkit/domain/repositories/palette_repository.dart';
import 'package:contribkit/domain/repositories/settings_repository.dart';
import 'package:contribkit/domain/services/contribution_grid_service.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/color.dart';
import 'package:contribkit/domain/value_objects/contribution_level.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/ui/di/providers.dart';
import 'package:contribkit/ui/features/viewer/viewer_notifier.dart';
import 'package:contribkit/ui/features/viewer/viewer_state.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const _nord = Palette(
  key: 'nord',
  name: 'Nord',
  none: Color(0xFF200000),
  noneLight: Color(0xFF2FFFFF),
  low: Color(0xFF200001),
  medium: Color(0xFF200002),
  high: Color(0xFF200003),
  veryHigh: Color(0xFF200004),
);

typedef _Fetched = ({ContributionCalendar calendar, bool fromCache});

ContributionCalendar _calendar({int year = 2024}) {
  final grid = ContributionGridService.buildFor(days: const [], year: year);
  return ContributionCalendar(
    username: Username('octocat'),
    year: Year(year),
    weeks: grid
        .map(
          (week) => ContributionWeek(
            days: week.days
                .map(
                  (day) => ContributionDay(
                    date: day.date,
                    count: 1,
                    level: ContributionLevel.low,
                  ),
                )
                .toList(),
          ),
        )
        .toList(),
    totalContributions: 371,
  );
}

final class _FakePaletteRepository implements PaletteRepository {
  _FakePaletteRepository({
    this.palettes = const [_nord],
    this.failure,
    this.gate,
  });

  final List<Palette> palettes;
  final Object? failure;
  final Future<List<Palette>>? gate;

  int reads = 0;

  @override
  Future<List<Palette>> loadAll() async {
    reads++;
    if (gate != null) return gate!;
    await Future<void>.delayed(Duration.zero);
    if (failure != null) throw failure!;
    return palettes;
  }
}

final class _FakeContributionRepository implements ContributionRepository {
  _FakeContributionRepository({this.answer, this.failure});

  final Future<_Fetched> Function(Username username, Year year)? answer;
  final Object? failure;

  int invalidations = 0;

  @override
  Future<_Fetched> fetchCalendar({
    required Username username,
    required Year year,
  }) {
    if (failure != null) return Future.error(failure!);
    if (answer != null) return answer!(username, year);
    return Future.value((
      calendar: _calendar(year: year.value),
      fromCache: false,
    ));
  }

  @override
  Future<void> invalidateCache(Username username) async {
    invalidations++;
  }
}

final class _FakeSettingsRepository implements SettingsRepository {
  _FakeSettingsRepository({
    this.settings = const AppSettings(),
    this.writeFails = false,
  });

  final AppSettings settings;
  final bool writeFails;

  @override
  Future<AppSettings> load() async => settings;

  @override
  Future<void> saveLastUsername(Username username) async {
    if (writeFails) throw const CacheFailure(message: 'box is gone');
  }

  @override
  Future<void> saveLastYear(Year year) async {
    if (writeFails) throw const CacheFailure(message: 'box is gone');
  }

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

ProviderContainer _container({
  _FakeSettingsRepository? settings,
  _FakePaletteRepository? palettes,
  _FakeContributionRepository? contributions,
}) {
  final container = ProviderContainer(
    overrides: [
      settingsRepositoryProvider.overrideWithValue(
        settings ?? _FakeSettingsRepository(),
      ),
      paletteRepositoryProvider.overrideWithValue(
        palettes ?? _FakePaletteRepository(),
      ),
      contributionRepositoryProvider.overrideWithValue(
        contributions ?? _FakeContributionRepository(),
      ),
    ],
  );
  addTearDown(container.dispose);
  return container;
}

Future<void> _settle() async {
  for (var hop = 0; hop < 8; hop++) {
    await Future<void>.delayed(Duration.zero);
  }
}

Future<ViewerNotifier> _ready(ProviderContainer container) async {
  container.listen(viewerProvider, (_, _) {});
  await _settle();
  return container.read(viewerProvider.notifier);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('build', () {
    test('answers synchronously with the empty state', () {
      final container = _container();

      expect(container.read(viewerProvider), const ViewerState());
    });

    test('applies the stored appearance once the microtask runs', () async {
      final container = _container(
        settings: _FakeSettingsRepository(
          settings: const AppSettings(
            cellShape: CellShape.hex,
            cellSize: CellSize.large,
            paletteKey: 'nord',
          ),
        ),
      );
      container.listen(viewerProvider, (_, _) {});

      await _settle();
      final state = container.read(viewerProvider);

      expect(state.cellShape, CellShape.hex);
      expect(state.cellSize, CellSize.large);
      expect(state.palette, _nord);
      expect(state.isLoadingSettings, isFalse);
    });
  });

  group('fetchContributions', () {
    test('clears the previous calendar before it refills', () async {
      final container = _container();
      final notifier = await _ready(container);

      await notifier.fetchContributions(
        username: Username('torvalds'),
        year: Year(2024),
      );
      expect(container.read(viewerProvider).calendar, isNotNull);

      final pending = notifier.fetchContributions(
        username: Username('gaearon'),
        year: Year(2023),
      );

      expect(
        container.read(viewerProvider).calendar,
        isNull,
        reason: 'the previous user must not sit under a new username',
      );
      expect(container.read(viewerProvider).stats, isNull);
      await pending;
    });

    test('drops a stale answer rather than letting it win', () async {
      final slow = Completer<_Fetched>();
      final fast = Completer<_Fetched>();
      final container = _container(
        contributions: _FakeContributionRepository(
          answer: (username, year) =>
              year.value == 2023 ? slow.future : fast.future,
        ),
      );
      final notifier = await _ready(container);

      final first = notifier.fetchContributions(
        username: Username('torvalds'),
        year: Year(2023),
      );
      final second = notifier.fetchContributions(
        username: Username('torvalds'),
        year: Year(2024),
      );

      fast.complete((calendar: _calendar(year: 2024), fromCache: false));
      await second;
      slow.complete((calendar: _calendar(year: 2023), fromCache: true));
      await first;

      final state = container.read(viewerProvider);

      expect(state.calendar?.year, Year(2024));
      expect(state.year, Year(2024));
      expect(
        state.fromCache,
        isFalse,
        reason: 'the stale answer carried fromCache: true',
      );
      expect(
        state.isLoadingCalendar,
        isFalse,
        reason: 'the stale finally must not reopen the spinner',
      );
    });

    test('a failed settings write leaves the calendar alone', () async {
      final container = _container(
        settings: _FakeSettingsRepository(writeFails: true),
      );
      final notifier = await _ready(container);

      await notifier.fetchContributions(
        username: Username('torvalds'),
        year: Year(2024),
      );

      final state = container.read(viewerProvider);

      expect(state.calendar, isNotNull);
      expect(state.error, isNull);
    });

    test('keeps a typed Failure typed', () async {
      final container = _container(
        contributions: _FakeContributionRepository(
          failure: const NotFoundFailure(username: 'ghost'),
        ),
      );
      final notifier = await _ready(container);

      await notifier.fetchContributions(
        username: Username('ghost'),
        year: Year(2024),
      );

      expect(container.read(viewerProvider).error, isA<NotFoundFailure>());
    });

    test('wraps anything that is not a Failure', () async {
      final container = _container(
        contributions: _FakeContributionRepository(failure: StateError('boom')),
      );
      final notifier = await _ready(container);

      await notifier.fetchContributions(
        username: Username('ghost'),
        year: Year(2024),
      );

      expect(container.read(viewerProvider).error, isA<UnexpectedFailure>());
    });
  });

  group('the Palette load', () {
    test('reports a failure and blocks while there is no Palette', () async {
      final container = _container(
        palettes: _FakePaletteRepository(
          failure: const AssetFailure(asset: 'assets/palettes.json'),
        ),
      );
      container.listen(viewerProvider, (_, _) {});

      await _settle();
      final state = container.read(viewerProvider);

      expect(state.paletteFailure, isA<AssetFailure>());
      expect(state.palette, isNull);
      expect(state.blockingFailure, isA<AssetFailure>());
    });

    test('two retries in flight read the asset once, not twice', () async {
      final palettes = _FakePaletteRepository(
        failure: const AssetFailure(asset: 'assets/palettes.json'),
      );
      final container = _container(palettes: palettes);
      final notifier = await _ready(container);
      expect(palettes.reads, 1, reason: 'the startup load');

      await Future.wait([notifier.retry(), notifier.retry()]);
      expect(
        palettes.reads,
        2,
        reason:
            'the retry button has no disabled state, so two taps must share '
            'one in-flight load rather than start two',
      );

      await notifier.retry();
      expect(
        palettes.reads,
        3,
        reason: 'and the memo must not outlive the load it shared',
      );
      expect(
        container.read(viewerProvider).paletteFailure,
        isA<AssetFailure>(),
        reason: 'the failure is the reason retry keeps reloading at all',
      );
    });

    test(
      'an empty Palette list is a broken asset, not a quiet nothing',
      () async {
        final container = _container(
          palettes: _FakePaletteRepository(palettes: const []),
        );
        container.listen(viewerProvider, (_, _) {});

        await _settle();
        final state = container.read(viewerProvider);

        expect(state.palette, isNull);
        expect(
          state.paletteFailure,
          isA<AssetFailure>(),
          reason:
              'we ship that file, so zero Palettes in it is a fault, and '
              '_Body used to synthesise this failure because the state could '
              'not express it',
        );
        expect(state.blockingFailure, isA<AssetFailure>());
      },
    );
  });

  group('being disposed mid-flight', () {
    ProviderContainer bare({
      _FakeSettingsRepository? settings,
      _FakePaletteRepository? palettes,
      _FakeContributionRepository? contributions,
    }) => ProviderContainer(
      overrides: [
        settingsRepositoryProvider.overrideWithValue(
          settings ?? _FakeSettingsRepository(),
        ),
        paletteRepositoryProvider.overrideWithValue(
          palettes ?? _FakePaletteRepository(),
        ),
        contributionRepositoryProvider.overrideWithValue(
          contributions ?? _FakeContributionRepository(),
        ),
      ],
    );

    test('drops the startup load before it even begins', () async {
      final gate = Completer<List<Palette>>();
      final container = bare(
        palettes: _FakePaletteRepository(gate: gate.future),
      );
      container.listen(viewerProvider, (_, _) {});

      container.dispose();
      gate.complete(const [_nord]);

      await _settle();
    });

    test('drops a Palette read that was already in flight', () async {
      final gate = Completer<List<Palette>>();
      final palettes = _FakePaletteRepository(gate: gate.future);
      final container = bare(palettes: palettes);
      container.listen(viewerProvider, (_, _) {});

      await _settle();
      expect(palettes.reads, 1, reason: 'the load must have started');

      container.dispose();
      gate.complete(const [_nord]);

      await _settle();
    });

    test('drops a fetch in flight rather than writing to a dead Ref', () async {
      final answer = Completer<_Fetched>();
      final container = bare(
        contributions: _FakeContributionRepository(
          answer: (username, year) => answer.future,
        ),
      );
      container.listen(viewerProvider, (_, _) {});
      await _settle();

      final pending = container
          .read(viewerProvider.notifier)
          .fetchContributions(username: Username('torvalds'), year: Year(2024));

      container.dispose();
      answer.complete((calendar: _calendar(), fromCache: false));

      await pending;
      await _settle();
    });

    test('drops a failing fetch in flight the same way', () async {
      final answer = Completer<_Fetched>();
      final container = bare(
        contributions: _FakeContributionRepository(
          answer: (username, year) => answer.future,
        ),
      );
      container.listen(viewerProvider, (_, _) {});
      await _settle();

      final pending = container
          .read(viewerProvider.notifier)
          .fetchContributions(username: Username('torvalds'), year: Year(2024));

      container.dispose();
      answer.completeError(const NetworkFailure(message: 'down'));

      await pending;
      await _settle();
    });
  });

  group('refreshContributions', () {
    test('invalidates the cache, and only once there is a username', () async {
      final contributions = _FakeContributionRepository();
      final container = _container(contributions: contributions);
      final notifier = await _ready(container);

      await notifier.refreshContributions();
      expect(contributions.invalidations, 0);

      await notifier.fetchContributions(
        username: Username('torvalds'),
        year: Year(2024),
      );
      await notifier.refreshContributions();

      expect(contributions.invalidations, 1);
    });
  });
}
