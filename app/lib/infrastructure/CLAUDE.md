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
- **Convert eagerly, inside the `try`.** `AssetSuggestedUsernameRepository` returned `data.cast<String>()`, and
  `cast` is a *lazy view*: a non-string element in the bundled JSON threw a raw `TypeError` when the caller
  iterated, which is after the `try` that would have made it a `ParseFailure`. It builds a `List<String>` eagerly
  now. Any `cast`, `map` or `where` returned from inside a `try` here has the same hole.
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
| `assets/` | Repositories over the bundled `assets/*.json` (palettes, suggested usernames) — generated copies of `shared/`. They throw `AssetFailure`, not `ParseFailure`: a broken file we ship is not GitHub changing its markup |
| `export/` | One repository per Export Format: PNG, SVG, Markdown |
| `tip/` | The RevenueCat implementation of `TipRepository` |

## `github/` — the second scraper

There are two scrapers on purpose, and whoever changes one changes the other
([ADR 0011](../../../docs/adr/0011-keep-the-apps-own-scraper-for-now.md)). They are **not** line-for-line
equivalent, and the differences are the whole reason this section exists:

| | Web (`web/src/infrastructure/github/`) | App (here) |
| --- | --- | --- |
| URL range | no query at all when no year is asked for (the live SVG-embed path); otherwise `from`, plus `to` only for a past year | **`from` and `to` always**, so the current year is closed at 31 December |
| `User-Agent` | a desktop Chrome string | `ContribKit/1.0 (Flutter)` |
| `X-Requested-With` | `XMLHttpRequest` | not sent |
| A `<td>` with no `id` | kept, `count: null` | kept, `count: null` |
| A day outside the requested year | kept | **dropped** (`date.year != year.value`) |
| Missing `data-level` | day dropped, grid backfills it | derived by `ContributionLevelService` |
| Unknown Count | `null` | `null` |
| HTTP 429 | `rateLimited(…, retryAfterSeconds)` | `RateLimitedFailure`, with `resetAt` from `Retry-After` |
| Timeout | 20 s → `network` | 20 s → `NetworkFailure` |
| Grid construction | in the domain layer | in the domain layer, `ContributionGridService` |

**Two passes over the HTML, joined on the `<td>`'s `id`.** Pass one collects `(date, level?, id?)` from every `<td>`
carrying `ContributionCalendar-day`; pass two builds `id → count` from every `<tool-tip for="…">`, taking the
leading digits of its text. A tool-tip with no leading number is skipped, so the day's Count is `null` rather than a zero nobody measured.

**A `<td>` with no `id` is kept, not dropped.** The id is the join key for the Count, so a day without one simply
has an unknown Count — which is exactly the state
[ADR 0019](../../../docs/adr/0019-an-unknown-count-is-null-in-both-clients.md) exists to represent, in its own
words: "a day whose Count could not be read still counts as active, because GitHub said it was". Pass one keyed
its map on the id and therefore dropped those days entirely; `ContributionGridService` re-inserted them at
`ContributionLevel.none`, so a day GitHub had coloured broke the Streak and vanished from `totalDaysActive`. The
web's parser has always kept them. This was the one divergence in the table above that contradicted an ADR
rather than being a deliberate difference.

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
- **The current year expires after 1 hour. An entry written after its Year ended never expires**, because a
  finished year cannot change — **but a snapshot taken while that year was still running can**. The check was
  `year.value < DateTime.now().year`, evaluated against today rather than against the entry: cache 2025 at 23:30
  on 31 December and two days later that entry became permanently unexpirable, so every Contribution made in the
  last hours of the year stayed invisible for the life of the install, in the app and on the Home Screen Widget.
  It is `cachedAt.isAfter(DateTime(year.value + 1))` now, and the repository takes a `now` so the rule has a test.
- **A cache read that throws anything at all returns `null`,** which the caller reads as a miss and refetches. A
  corrupt or schema-drifted entry therefore heals itself silently and never surfaces as a `CacheFailure`. Do not
  "improve" this into a throw: a bad cache entry must never make the app unusable.
- **A cache write that throws is swallowed entirely.** Failing to cache is not failing to fetch.
- **The key is lower-cased, because GitHub handles are case-insensitive.** `Torvalds` and `torvalds` are one
  account and used to be two entries — two fetches, and an `invalidateCache` that cleared only the spelling it
  was handed, so the refresh button could appear to do nothing. `Username` still carries what the person typed:
  the normalisation belongs to the key, not to the value object, which stays display-faithful.
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

**Three shapes are extracted rather than spelled out.** `_enumByName` is the one enum-by-name lookup (it was
written three times), and `_readWithLegacy` / `_writeReplacingLegacy` are the migration pair (four hand-spelled
lines over two keys). That matters for the rule below: "add the legacy fallback" used to mean remembering `??` in
the getter *and* `delete` in the setter, in two separate places, with nothing linking them.

**Enums are persisted by `name`, never by `index`.** Reordering the enum is then free; renaming a *case* is a
migration. Adding or renaming a key means adding the legacy fallback **and** a migration test in the same commit, or
users silently lose the setting.

## `export/`

One repository per Export Format, each returning bytes and each converting its own failures to `ExportFailure`.

**The SVG and Markdown repositories are tested; the PNG one is not.** That split is about reach, not importance.
`SvgExportRepository` touches nothing but `dart:convert` and this project's own domain — it is a pure function
behind a `Future`, and its test pins the document size (including the trailing gap the width subtracts and the web
does not), the `<title>`, one Cell per Contribution Day, `isDark: true` keeping `noneLight` out of an Export
([ADR 0012](../../../docs/adr/0012-light-theme-palette-variant-is-app-only.md)), the `unknown` wording for a Count
nobody measured ([ADR 0019](../../../docs/adr/0019-an-unknown-count-is-null-in-both-clients.md)), all five Cell
Shapes, and that the corner radius and dot radius come from `CellGeometryService` rather than a local number.
`MarkdownExportRepository` is tested through a fake `ExportRepository`, which is the seam it already had and nobody
was using. `PngExportRepository` paints on a `dart:ui` canvas: reachable under `flutter test` via the Skia software
path, but its assertions would be PNG header and pixel probes, and its `byteData == null` arm cannot be reached
from outside at all.

Two of the three carry an `on ExportFailure { rethrow; }` arm ahead of the catch-all, so a failure that is already typed
keeps its own message instead of being wrapped twice — **and they need it for different reasons**. Markdown is the
only one that composes another repository: it holds the SVG repository and embeds its output, so the arm passes an
SVG failure through unchanged. PNG composes nothing — it paints straight onto a `dart:ui` canvas — but throws
`ExportFailure` *itself* mid-method when the encode returns no bytes, and the arm is what stops its own throw from
being re-wrapped as `PNG render failed: ExportFailure: …`. The SVG repository has neither situation and has no arm.

## `tip/`

`RevenueCatTipRepository`, mapping every SDK error to `TipFailure`. **It exposes Tip Products and a `give` call, and
nothing that reports entitlement**, because a Tip unlocks nothing and no code may start checking whether one was
given ([ADR 0009](../../../docs/adr/0009-tips-are-unconditional-and-unlock-nothing.md)). It was
`purchase/RevenueCatPurchaseRepository` implementing `PurchaseRepository` until the glossary guard learned to see
the word `purchase`, which Tip's `_Avoid_` list has always named.

**The cancellation check lives in `store_error.dart`, and it exists because the SDK helper throws.**
`PurchasesErrorHelper.getErrorCode` is `num.parse(e.code).round()` — it throws `FormatException` on any
non-numeric code, and Flutter raises `PlatformException(code: 'channel-error')` on a channel fault. Called from
inside `on PlatformException catch`, that `FormatException` does **not** fall into the sibling `catch (e)`; it
escapes the layer whose first rule forbids exactly that. `isTipCancellation` parses the code itself first and
returns false for anything non-numeric or negative, so the helper is only ever handed input it can survive. It is
a separate module because it is the one part of this file with a seam, and it has five tests.

**`give` returns a `TipOutcome`, and the cancel arm it used to carry could never run.** `Purchases.purchase` throws
a `PlatformException`; `PurchasesErrorCode` is a plain enum that nothing in the package ever throws, so
`on PurchasesErrorCode catch (e) { if (e == purchaseCancelledError) return; }` matched nothing at all — a person
who backed out of the store sheet fell through to the catch-all and was shown
`Tip failed: PlatformException(1, Purchase was cancelled., null, null)`, the raw SDK string, presented as an error.
The conversion the package documents is `PurchasesErrorHelper.getErrorCode(PlatformException)`, and that is what
runs now: the cancel code becomes `TipOutcome.cancelled`, anything else a `TipFailure` carrying `e.message` rather
than a stringified exception. **A dead catch clause is invisible to the analyzer and to every test**, and this one
survived a pass that fixed the `firstWhere` two lines below it.

`give` carries an `on TipFailure { rethrow; }` arm ahead of its catch-all, for the same reason two of the export
repositories do: it throws `TipFailure` *itself* when no package matches the Tip Product, and without the arm its
own throw came back re-wrapped. Finding the package is a `where` plus an `isEmpty` check, **not `firstWhere`** —
`firstWhere` throws `StateError` rather than returning null, so the `'Tip Product not found'` sentence was
unreachable and a missing product id surfaced to the user as `Bad state: No element`. The `?.` on the offering made
the null guard look sound. `getProducts` sorts a **copy** of `availablePackages`, because the list it is given
belongs to the SDK, and carries the same rethrow arm for symmetry.

**There is still no seam here.** Every entry point is a static `Purchases` call and `Offering` / `Package` /
`StoreProduct` are concrete classes, so a fake would assert against RevenueCat's wire shape rather than this code.
That is why the cancel defect had to be found by reading the package's source, and it is the reason to be
suspicious of this file specifically.

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
- **`_readCache` takes the `Username` it was called with** rather than rebuilding one from the cache key. It used
  to split the key on `:` and re-parse the first half, which once the key was lower-cased would have handed back
  a differently-cased calendar on a cache hit than on a fresh fetch.
- **`yearMax` is computed over the days actually present**, so a derived level depends on the rest of the year. Two
  partial fetches of the same year can disagree about a day's level — another reason a parsed `data-level` is
  preferred wherever it exists.
- The `RateLimitedFailure.resetAt` parser accepts `Retry-After` in both forms the RFC allows: an integer count of
  seconds, added to now, or an HTTP-date parsed with `HttpDate.parse` from `dart:io`. The date branch used to be
  `DateTime.tryParse`, which only understands ISO-8601 — `Wed, 21 Oct 2015 07:28:00 GMT` came back `null`, so half
  the spec was silently unsupported while the doc claimed both. ISO-8601 remains as a fallback. A header neither can
  read still leaves `resetAt` as `null`, which the UI has to tolerate.
