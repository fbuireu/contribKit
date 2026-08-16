# app/lib/infrastructure

Concrete implementations of the six `domain/` repository interfaces. May depend on pub packages; must not depend on
Flutter widgets, and must never import from `ui/`.

## Invariants & rules

- **Every infrastructure exception is caught here and rethrown as a `Failure`.** A raw `PlatformException`,
  `HiveError`, `SocketException` or `FormatException` must not reach `application/` or `ui/`
  ([ADR 0004](../../../docs/adr/0004-typed-failures-instead-of-thrown-exceptions.md)). This is the rule the layer
  keeps drifting from: the two asset repositories had no error handling at all — a missing or malformed bundled
  JSON threw a raw `FlutterError` straight through — and `invalidateCache` reached Hive outside any `try`. Both now
  convert. When adding a method here, the question is not "can this fail" but "which `Failure` does it fail as".
- **DTOs convert to entities at the boundary and never leak upward.** See
  [`github/dtos/`](./github/dtos/CLAUDE.md).
- **Levels come from GitHub when GitHub supplies them.** `data-level` is authoritative; a derived level is a
  fallback, not the normal path.

## Layout

| Directory | Contents |
|---|---|
| `github/` | `GitHubContributionRepository` — scraping plus the Hive calendar cache |
| `github/dtos/` | JSON transfer objects for the cache, converted before leaving the layer |
| `persistence/` | `HiveSettingsRepository` — every stored setting |
| `assets/` | Repositories over the bundled `assets/*.json` (palettes, suggested usernames) — generated copies of `shared/` |
| `export/` | One repository per Export Format: PNG, SVG, Markdown |
| `purchase/` | The RevenueCat implementation of `PurchaseRepository` |

## `github/` — the second scraper

There are two scrapers on purpose, and whoever changes one changes the other
([ADR 0011](../../../docs/adr/0011-keep-the-apps-own-scraper-for-now.md)). They are **not** line-for-line
equivalent, and the differences are the whole reason this section exists:

| | Web (`web/src/infrastructure/github/`) | App (here) |
| --- | --- | --- |
| URL range | no query at all when no year is asked for (the live SVG-embed path); otherwise `from`, plus `to` only for a past year | **`from` and `to` always**, so the current year is closed at 31 December |
| `User-Agent` | a desktop Chrome string | `ContribKit/1.0 (Flutter)` |
| `X-Requested-With` | `XMLHttpRequest` | not sent |
| A `<td>` with no `id` | kept, `count: null` | **dropped** — the id is the join key |
| A day outside the requested year | kept | **dropped** (`date.year != year.value`) |
| Missing `data-level` | day dropped, grid backfills it | derived by `ContributionLevelService` |
| Unknown Count | `null` | `null` |
| HTTP 429 | `network(…, 429)` | `RateLimitedFailure`, with `resetAt` from `Retry-After` |
| Timeout | none set | 20 s → `NetworkFailure` |
| Grid construction | in the domain layer | in the domain layer, `ContributionGridService` |

**Two passes over the HTML, joined on the `<td>`'s `id`.** Pass one builds `id → (date, level?)` from every `<td>`
carrying `ContributionCalendar-day`; pass two builds `id → count` from every `<tool-tip for="…">`, taking the
leading digits of its text. A tool-tip with no leading number is skipped, so the day's Count is `null` rather than a zero nobody measured.

**An empty first pass is a `ParseFailure`, never an empty calendar** — a calendar of zeros is a lie a reader cannot
detect ([ADR 0005](../../../docs/adr/0005-scrape-githubs-public-contributions-html.md)).

`ContributionGridService.buildFor` always emits 53 × 7 days, starting from the Sunday on or before 1 January
(`firstOfYear.weekday % 7` — Dart weekdays run 1 = Monday … 7 = Sunday, so Sunday maps to 0). Dates with no parsed
day become `count: null, level: none` — an unknown Count, not a measured zero
([ADR 0013](../../../docs/adr/0013-the-app-grid-is-always-53-by-7.md)).

**Every date in that walk is built with the `DateTime` constructor, never by adding a `Duration`.** This is not a
style preference. `DateTime.add(Duration(days: 1))` adds 24 hours of absolute time, so crossing a daylight-saving
boundary moves the wall clock: a walk that starts at local midnight in December lands on `01:00` once the clock goes
forward, and `byDate[date]` — whose keys are `DateTime(y, m, d)`, exact midnights — then misses **every day from the
spring transition onward**. In Europe that silently blanked roughly seven months of every calendar. `DateTime(start.year,
start.month, start.day + offset)` normalises the overflow itself and always yields midnight. The same rule applies to
the streak walk in `ui/features/widget/calendar_widget_service.dart`, which had the same defect walking backwards.

### The cache

- **Box `contribution_cache_v3`, keyed `<username>:<year>`.** Changing what a cached calendar *means* requires
  bumping that name; `legacyContributionCacheBoxNames` lists every previous one, and `app/lib/main.dart` deletes them at
  startup ([ADR 0014](../../../docs/adr/0014-cached-calendars-are-versioned.md)).
- **The current year expires after 1 hour. Past years never expire**, because a finished year cannot change.
- **A cache read that throws anything at all returns `null`,** which the caller reads as a miss and refetches. A
  corrupt or schema-drifted entry therefore heals itself silently and never surfaces as a `CacheFailure`. Do not
  "improve" this into a throw: a bad cache entry must never make the app unusable.
- **A cache write that throws is swallowed entirely.** Failing to cache is not failing to fetch.
- `invalidateCache(username)` deletes every key with that username prefix, so it clears all years at once.
- **A cache hit builds the same lattice as a fresh fetch.** `_toDomain` flattens the stored weeks back to days and
  hands them to `ContributionGridService`, rather than trusting the shape it read. It used to map the DTO's weeks
  straight through, so the grid invariant held on the cached path only because `_toDto` had written it correctly —
  and when the walk was building the wrong dates, the cache faithfully stored the wrong grid and served it back.

## `persistence/` — settings

`HiveSettingsRepository` over the `settings` box. Every accessor goes through one of two private helpers: `_write`
wraps any failure in `CacheFailure`, and **`_read` returns `null` for anything that goes wrong** — a box that will
not open, a value stored under the wrong type, a stored username that no longer validates, an enum name that no
longer exists. A corrupted setting degrades to "unset" rather than blocking the app. Before those helpers existed
the getters were unguarded, so a value written as an `int` by an older build reached an `as String?` cast and threw
a `TypeError` out of a layer whose first rule is that nothing but a `Failure` leaves it.

The stored keys, and the two that carry a legacy fallback:

| Key | Legacy fallback | Stored as |
| --- | --- | --- |
| `lastUsername` | — | `String` |
| `lastYear` | — | `int` |
| `paletteKey` | `paletteName` | `String` |
| `cellShape` · `cellSize` · `themeMode` | — | the enum's `name` |
| `backgroundPreset` | `cardBackground` | the enum's `name` |

**Enums are persisted by `name`, never by `index`.** Reordering the enum is then free; renaming a *case* is a
migration. Adding or renaming a key means adding the legacy fallback **and** a migration test in the same commit, or
users silently lose the setting.

## `export/`

One repository per Export Format, each returning bytes and each converting its own failures to `ExportFailure`. Two
of the three carry an `on ExportFailure { rethrow; }` arm ahead of the catch-all, so a failure that is already typed
keeps its own message instead of being wrapped twice — **and they need it for different reasons**. Markdown is the
only one that composes another repository: it holds the SVG repository and embeds its output, so the arm passes an
SVG failure through unchanged. PNG composes nothing — it paints straight onto a `dart:ui` canvas — but throws
`ExportFailure` *itself* mid-method when the encode returns no bytes, and the arm is what stops its own throw from
being re-wrapped as `PNG render failed: ExportFailure: …`. The SVG repository has neither situation and has no arm.

## `purchase/`

The RevenueCat implementation, mapping every SDK error to `PurchaseFailure`. **It exposes products and a purchase
call, and nothing that reports entitlement**, because a Tip unlocks nothing and no code may start checking purchase
state ([ADR 0009](../../../docs/adr/0009-tips-are-unconditional-and-unlock-nothing.md)).

## Gotchas

- **`app/lib/main.dart`'s WorkManager isolate goes through `HiveSettingsRepository`.** It used to open the
  `settings` box itself and read `lastUsername`, `lastYear`, `paletteKey`/`paletteName`, `cellShape` and `cellSize`
  **by string literal**, so a rename that updated this layer and not `main.dart` compiled, passed tests, and broke
  the home-screen widget silently. It also re-spelled the legacy-key fallback and the enum defaults, and its first
  two reads sat outside the `try`, so a value stored under the wrong type threw a raw `TypeError` out of the
  isolate rather than degrading through `_read`. The isolate still constructs its repositories by hand, because a
  background isolate has no `ProviderScope` — but it no longer knows a single storage key, and since the refresh
  sequence moved into `HomeScreenWidgetRefresh` it no longer knows the order of the reads either.
  This is the first of the three traps in the [root guide](../../../CLAUDE.md#maintenance-contract).
- **`_toDto` is hand-written; the DTOs are read-only.** Serialisation is a map literal in the repository, so codegen
  cannot tell you when the two drift — see [`github/dtos/`](./github/dtos/CLAUDE.md).
- **`_readCache` reconstructs the `Username` from the cache key** by splitting on `:`. It sits inside the same
  catch-all, so an unparseable key is a miss rather than a crash.
- **`yearMax` is computed over the days actually present**, so a derived level depends on the rest of the year. Two
  partial fetches of the same year can disagree about a day's level — another reason a parsed `data-level` is
  preferred wherever it exists.
- The `RateLimitedFailure.resetAt` parser accepts `Retry-After` in both forms the RFC allows: an integer count of
  seconds, added to now, or an HTTP-date parsed with `HttpDate.parse` from `dart:io`. The date branch used to be
  `DateTime.tryParse`, which only understands ISO-8601 — `Wed, 21 Oct 2015 07:28:00 GMT` came back `null`, so half
  the spec was silently unsupported while the doc claimed both. ISO-8601 remains as a fallback. A header neither can
  read still leaves `resetAt` as `null`, which the UI has to tolerate.
