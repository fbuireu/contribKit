import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/repositories/contribution_repository.dart';
import 'package:contribkit/domain/repositories/export_delivery_repository.dart';
import 'package:contribkit/domain/repositories/export_repository.dart';
import 'package:contribkit/domain/repositories/palette_repository.dart';
import 'package:contribkit/domain/repositories/settings_repository.dart';
import 'package:contribkit/domain/repositories/suggested_username_repository.dart';
import 'package:contribkit/domain/repositories/tip_repository.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/domain/value_objects/tip_outcome.dart';
import 'package:contribkit/domain/value_objects/tip_product.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';

import 'fixtures.dart';

final class FakeSettingsRepository implements SettingsRepository {
  FakeSettingsRepository({this.settings = const AppSettings(), this.failure});

  final AppSettings settings;
  final Object? failure;

  final writes = <String, Object>{};

  @override
  Future<AppSettings> load() async {
    if (failure case final error?) throw error;
    return settings;
  }

  @override
  Future<void> saveLastUsername(Username username) async {
    writes['lastUsername'] = username;
  }

  @override
  Future<void> saveLastYear(Year year) async {
    writes['lastYear'] = year;
  }

  @override
  Future<void> savePaletteKey(String key) async {
    writes['paletteKey'] = key;
  }

  @override
  Future<void> saveCellShape(CellShape shape) async {
    writes['cellShape'] = shape;
  }

  @override
  Future<void> saveCellSize(CellSize size) async {
    writes['cellSize'] = size;
  }

  @override
  Future<void> saveBackgroundPreset(String presetName) async {
    writes['backgroundPreset'] = presetName;
  }

  @override
  Future<void> saveThemeMode(AppThemeMode mode) async {
    writes['themeMode'] = mode;
  }
}

final class FakePaletteRepository implements PaletteRepository {
  FakePaletteRepository({
    this.palettes = const [testPalette],
    this.failure,
    this.gate,
  });

  final List<Palette> palettes;
  final Object? failure;
  final Future<void>? gate;

  int reads = 0;

  @override
  Future<List<Palette>> loadAll() async {
    reads++;
    if (gate case final wait?) await wait;
    if (failure case final error?) throw error;
    return palettes;
  }
}

final class FakeSuggestedUsernameRepository
    implements SuggestedUsernameRepository {
  FakeSuggestedUsernameRepository({
    this.names = const ['torvalds', 'gaearon'],
    this.failure,
    this.gate,
  });

  final List<String> names;
  final Object? failure;
  final Future<void>? gate;

  @override
  Future<List<String>> loadAll() async {
    if (gate case final wait?) await wait;
    if (failure case final error?) throw error;
    return names;
  }
}

final class FakeContributionRepository implements ContributionRepository {
  FakeContributionRepository({
    this.answer,
    this.failure,
    this.fromCache = false,
    this.failFetchesBefore = 0,
    this.gate,
  });

  final ContributionCalendar? answer;
  final Object? failure;
  final bool fromCache;
  final int failFetchesBefore;
  final Future<void>? gate;

  final invalidated = <Username>[];

  int fetches = 0;

  @override
  Future<({ContributionCalendar calendar, bool fromCache})> fetchCalendar({
    required Username username,
    required Year year,
  }) async {
    fetches++;
    if (gate case final wait?) await wait;
    if (fetches <= failFetchesBefore) {
      throw const NetworkFailure(message: 'offline');
    }
    if (failure case final error?) throw error;
    return (
      calendar: answer ?? testCalendar(year: year.value),
      fromCache: fromCache,
    );
  }

  @override
  Future<void> invalidateCache(Username username) async {
    invalidated.add(username);
  }
}

final class FakeExportRepository implements ExportRepository {
  FakeExportRepository({this.bytes = const [1, 2, 3], this.failure});

  final List<int> bytes;
  final Object? failure;

  int calls = 0;
  RenderOptions? lastOptions;
  ContributionCalendar? lastCalendar;

  @override
  Future<List<int>> export({
    required ContributionCalendar calendar,
    required RenderOptions options,
  }) async {
    calls++;
    lastCalendar = calendar;
    lastOptions = options;
    if (failure case final error?) throw error;
    return bytes;
  }
}

final class FakeTipRepository implements TipRepository {
  FakeTipRepository({
    this.products = testTipProducts,
    this.outcome = TipOutcome.completed,
    this.productsFailure,
    this.giveFailure,
    this.gate,
    this.giveGate,
    this.failLoadsBefore = 0,
  });

  final List<TipProduct> products;
  final TipOutcome outcome;
  final Object? productsFailure;
  final Object? giveFailure;
  final Future<void>? gate;
  final Future<void>? giveGate;
  final int failLoadsBefore;

  final given = <TipProduct>[];

  int loads = 0;

  @override
  Future<List<TipProduct>> getProducts() async {
    loads++;
    if (gate case final wait?) await wait;
    if (loads <= failLoadsBefore) {
      throw const TipFailure(message: 'store unreachable');
    }
    if (productsFailure case final error?) throw error;
    return products;
  }

  @override
  Future<TipOutcome> give(TipProduct product) async {
    given.add(product);
    if (giveGate case final wait?) await wait;
    if (giveFailure case final error?) throw error;
    return outcome;
  }
}

final class FakeExportDelivery implements ExportDeliveryRepository {
  FakeExportDelivery({this.failure});

  final Object? failure;

  final shared = <({List<int> bytes, String fileName, String mimeType})>[];
  final copied = <String>[];

  @override
  Future<void> shareFile({
    required List<int> bytes,
    required String fileName,
    required String mimeType,
  }) async {
    if (failure case final error?) throw error;
    shared.add((bytes: bytes, fileName: fileName, mimeType: mimeType));
  }

  @override
  Future<void> copyText(String text) async {
    if (failure case final error?) throw error;
    copied.add(text);
  }
}
