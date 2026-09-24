import 'dart:async';

import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/entities/contribution_day.dart';
import 'package:contribkit/domain/entities/contribution_week.dart';
import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/repositories/contribution_repository.dart';
import 'package:contribkit/domain/repositories/palette_repository.dart';
import 'package:contribkit/domain/repositories/settings_repository.dart';
import 'package:contribkit/domain/services/contribution_grid_service.dart';
import 'package:contribkit/domain/value_objects/background_preset.dart';
import 'package:contribkit/domain/value_objects/calendar_failure_kind.dart';
import 'package:contribkit/domain/value_objects/calendar_request_source.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/color.dart';
import 'package:contribkit/domain/value_objects/contribution_level.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/domain/value_objects/telemetry_consent.dart';
import 'package:contribkit/domain/value_objects/usage_event.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/ui/di/providers.dart';
import 'package:contribkit/ui/features/viewer/viewer_notifier.dart';
import 'package:contribkit/ui/features/viewer/viewer_state.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../support/fakes.dart';

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
  _FakePaletteRepository({this.palettes = const [_nord], this.failure});

  final List<Palette> palettes;
  final Object? failure;

  int reads = 0;

  @override
  Future<List<Palette>> loadAll() async {
    reads++;
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
  Future<void> savePaletteKey(String key) async {
    if (writeFails) throw const CacheFailure(message: 'box is gone');
  }

  @override
  Future<void> saveCellShape(CellShape shape) async {
    if (writeFails) throw const CacheFailure(message: 'box is gone');
  }

  @override
  Future<void> saveCellSize(CellSize size) async {
    if (writeFails) throw const CacheFailure(message: 'box is gone');
  }

  @override
  Future<void> saveBackgroundPreset(String presetName) async {
    if (writeFails) throw const CacheFailure(message: 'box is gone');
  }

  @override
  Future<void> saveThemeMode(AppThemeMode mode) async {}

  @override
  Future<void> saveTelemetryConsent(TelemetryConsent consent) async {}
}

ProviderContainer _container({
  _FakeSettingsRepository? settings,
  _FakePaletteRepository? palettes,
  _FakeContributionRepository? contributions,
  FakeUsageEventRepository? usageEvents,
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
      usageEventRepositoryProvider.overrideWithValue(
        usageEvents ?? FakeUsageEventRepository(),
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
        source: CalendarRequestSource.typed,
      );
      expect(container.read(viewerProvider).calendar, isNotNull);

      final pending = notifier.fetchContributions(
        username: Username('gaearon'),
        year: Year(2023),
        source: CalendarRequestSource.typed,
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
        source: CalendarRequestSource.typed,
      );
      final second = notifier.fetchContributions(
        username: Username('torvalds'),
        year: Year(2024),
        source: CalendarRequestSource.typed,
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
        source: CalendarRequestSource.typed,
      );

      final state = container.read(viewerProvider);

      expect(state.calendar, isNotNull);
      expect(state.error, isNull);
    });

    test('keeps a typed Failure typed', () async {
      final container = _container(
        contributions: _FakeContributionRepository(
          failure: NotFoundFailure(username: Username('ghost')),
        ),
      );
      final notifier = await _ready(container);

      await notifier.fetchContributions(
        username: Username('ghost'),
        year: Year(2024),
        source: CalendarRequestSource.typed,
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
        source: CalendarRequestSource.typed,
      );

      expect(container.read(viewerProvider).error, isA<UnexpectedFailure>());
    });
  });

  group('a settings write that fails', () {
    test('never escapes as an uncaught async error', () async {
      final errors = <Object>[];

      await runZonedGuarded(() async {
        final container = _container(
          settings: _FakeSettingsRepository(writeFails: true),
        );
        addTearDown(container.dispose);
        container.listen(viewerProvider, (_, _) {});
        await _settle();

        container.read(viewerProvider.notifier)
          ..setCellShape(CellShape.hex)
          ..setCellSize(CellSize.large);
        await _settle();
      }, (error, _) => errors.add(error));

      expect(
        errors,
        isEmpty,
        reason:
            'a CacheFailure from a fire-and-forget write reached the zone '
            'handler, which is not the exhaustive match ADR 0004 asks for',
      );
    });

    test(
      'still applies the choice, because the screen is not the store',
      () async {
        final container = _container(
          settings: _FakeSettingsRepository(writeFails: true),
        );
        addTearDown(container.dispose);
        container.listen(viewerProvider, (_, _) {});
        await _settle();

        container.read(viewerProvider.notifier).setCellShape(CellShape.hex);
        await _settle();

        expect(container.read(viewerProvider).cellShape, CellShape.hex);
      },
    );
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

    test('never starts the startup load at all', () async {
      final palettes = _FakePaletteRepository();
      final container = bare(palettes: palettes);
      container.listen(viewerProvider, (_, _) {});

      container.dispose();
      await _settle();

      expect(
        palettes.reads,
        0,
        reason:
            'the entry guard returns before _loadPalettes, so the whole '
            'sequence is skipped rather than half-run',
      );
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
          .fetchContributions(
            username: Username('torvalds'),
            year: Year(2024),
            source: CalendarRequestSource.typed,
          );

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
          .fetchContributions(
            username: Username('torvalds'),
            year: Year(2024),
            source: CalendarRequestSource.typed,
          );

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
        source: CalendarRequestSource.typed,
      );
      await notifier.refreshContributions();

      expect(contributions.invalidations, 1);
    });
  });

  group('the Usage Events it records', () {
    test('a viewed calendar carries its Year, source and cache flag', () async {
      final usageEvents = FakeUsageEventRepository();
      final container = _container(
        usageEvents: usageEvents,
        contributions: _FakeContributionRepository(
          answer: (username, year) => Future.value((
            calendar: _calendar(year: year.value),
            fromCache: true,
          )),
        ),
      );
      final notifier = await _ready(container);

      await notifier.fetchContributions(
        username: Username('torvalds'),
        year: Year(2023),
        source: CalendarRequestSource.suggestion,
      );

      expect(usageEvents.recorded, [
        UsageEvent.calendarViewed(
          year: Year(2023),
          source: CalendarRequestSource.suggestion,
          fromCache: true,
        ),
      ]);
    });

    test('a restored username is fetched as restored', () async {
      final usageEvents = FakeUsageEventRepository();
      final container = _container(
        usageEvents: usageEvents,
        settings: _FakeSettingsRepository(
          settings: AppSettings(
            lastUsername: Username('torvalds'),
            lastYear: Year(2022),
          ),
        ),
      );
      await _ready(container);

      expect(usageEvents.recorded, [
        UsageEvent.calendarViewed(
          year: Year(2022),
          source: CalendarRequestSource.restored,
          fromCache: false,
        ),
      ]);
    });

    test(
      'a typed Failure is recorded by its kind, never its message',
      () async {
        final usageEvents = FakeUsageEventRepository();
        final container = _container(
          usageEvents: usageEvents,
          contributions: _FakeContributionRepository(
            failure: NotFoundFailure(username: Username('ghost')),
          ),
        );
        final notifier = await _ready(container);

        await notifier.fetchContributions(
          username: Username('ghost'),
          year: Year(2024),
          source: CalendarRequestSource.typed,
        );

        expect(usageEvents.recorded, [
          UsageEvent.calendarRequestFailed(
            source: CalendarRequestSource.typed,
            reason: CalendarFailureKind.notFound,
          ),
        ]);
        for (final event in usageEvents.recorded) {
          expect(event.properties.values, isNot(contains(contains('ghost'))));
        }
      },
    );

    test('anything that is not a Failure is recorded as unexpected', () async {
      final usageEvents = FakeUsageEventRepository();
      final container = _container(
        usageEvents: usageEvents,
        contributions: _FakeContributionRepository(failure: StateError('boom')),
      );
      final notifier = await _ready(container);

      await notifier.fetchContributions(
        username: Username('ghost'),
        year: Year(2024),
        source: CalendarRequestSource.retry,
      );

      expect(usageEvents.recorded, [
        UsageEvent.calendarRequestFailed(
          source: CalendarRequestSource.retry,
          reason: CalendarFailureKind.unexpected,
        ),
      ]);
    });

    test('a stale answer records nothing, viewed or failed', () async {
      final usageEvents = FakeUsageEventRepository();
      final slow = Completer<_Fetched>();
      final container = _container(
        usageEvents: usageEvents,
        contributions: _FakeContributionRepository(
          answer: (username, year) => year.value == 2023
              ? slow.future
              : Future.value((
                  calendar: _calendar(year: 2024),
                  fromCache: false,
                )),
        ),
      );
      final notifier = await _ready(container);

      final first = notifier.fetchContributions(
        username: Username('torvalds'),
        year: Year(2023),
        source: CalendarRequestSource.typed,
      );
      await notifier.fetchContributions(
        username: Username('torvalds'),
        year: Year(2024),
        source: CalendarRequestSource.typed,
      );
      slow.completeError(const NetworkFailure(message: 'down'));
      await first;

      expect(usageEvents.recorded, [
        UsageEvent.calendarViewed(
          year: Year(2024),
          source: CalendarRequestSource.typed,
          fromCache: false,
        ),
      ]);
    });

    test('choosing a Year records the choice and fetches it as year', () async {
      final usageEvents = FakeUsageEventRepository();
      final container = _container(usageEvents: usageEvents);
      final notifier = await _ready(container);
      await notifier.fetchContributions(
        username: Username('torvalds'),
        year: Year(2024),
        source: CalendarRequestSource.typed,
      );
      usageEvents.recorded.clear();

      notifier.setYear(Year(2021));
      await _settle();

      expect(usageEvents.recorded, [
        UsageEvent.yearChosen(year: Year(2021)),
        UsageEvent.calendarViewed(
          year: Year(2021),
          source: CalendarRequestSource.year,
          fromCache: false,
        ),
      ]);
    });

    test('choosing a Year with nobody to look up records only that', () async {
      final usageEvents = FakeUsageEventRepository();
      final container = _container(usageEvents: usageEvents);
      final notifier = await _ready(container);

      notifier.setYear(Year(2021));
      await _settle();

      expect(usageEvents.recorded, [UsageEvent.yearChosen(year: Year(2021))]);
      expect(container.read(viewerProvider).year, Year(2021));
    });

    test('a refresh and a retry each name themselves as the source', () async {
      final usageEvents = FakeUsageEventRepository();
      final container = _container(usageEvents: usageEvents);
      final notifier = await _ready(container);
      await notifier.fetchContributions(
        username: Username('torvalds'),
        year: Year(2024),
        source: CalendarRequestSource.typed,
      );
      usageEvents.recorded.clear();

      await notifier.refreshContributions();
      await notifier.retry();

      expect(usageEvents.recorded.map((event) => event.properties['source']), [
        'refresh',
        'retry',
      ]);
    });

    test('every Customizer choice carries the option chosen', () async {
      final usageEvents = FakeUsageEventRepository();
      final container = _container(usageEvents: usageEvents);
      final notifier = await _ready(container);

      notifier
        ..setPalette(_nord)
        ..setCellShape(CellShape.hex)
        ..setCellSize(CellSize.large)
        ..setBackgroundPreset(BackgroundPreset.navy);
      await _settle();

      expect(usageEvents.recorded, [
        UsageEvent.paletteChosen(palette: _nord),
        UsageEvent.cellShapeChosen(shape: CellShape.hex),
        UsageEvent.cellSizeChosen(size: CellSize.large),
        UsageEvent.backgroundChosen(preset: BackgroundPreset.navy),
      ]);
    });
  });
}
