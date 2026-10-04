# app/lib/infrastructure

Concrete implementations of the `domain/` repository interfaces. May depend on pub packages and on Flutter; only the
Sentry adapter imports `package:flutter/widgets.dart`, because its masking callback reads widgets. It never imports
from `ui/` or `application/`. DTOs convert to entities inside `github/` and never leave it; see
[`github/dtos/`](./github/dtos/AGENTS.md).

## Layout

| Directory | Contents |
|---|---|
| `github/` | `GitHubContributionRepository`: scraping plus the Hive calendar cache |
| `http/` | `RetryAfter`, the one `Retry-After` parser, which both HTTP repositories read |
| `contact/` | `HttpContactMessageRepository`: **the only call this app makes to a ContribKit server** |
| [`github/dtos/`](./github/dtos) | JSON transfer objects for the cache, converted before leaving the layer |
| `persistence/` | `HiveSettingsRepository`: every stored setting |
| `assets/` | Repositories over the bundled `assets/*.json` (palettes, suggested usernames): generated copies of `shared/`. They throw `AssetFailure`, not `ParseFailure`: a broken file we ship is not GitHub changing its markup |
| `export/` | One repository per Export Format: PNG, SVG, Markdown, plus `PlatformExportDelivery`, the only file that names `share_plus` or `Clipboard` |
| `tip/` | The RevenueCat implementation of `TipRepository` |
| `telemetry/` | Sentry behind `DiagnosticsRepository`, PostHog behind `UsageEventRepository`, and the `--dart-define` config both read. All four methods of both adapters swallow every error, so an SDK that throws never reaches the caller; what `start` and `applyConsent` catch goes to `reportTelemetryFailure` in `telemetry_failure.dart`, which hands it to `FlutterError.reportError`, where Sentry's own integration captures it while Diagnostic Reports are on. Consent fails closed: an adapter stops sending before it asks its SDK to stop, a failed PostHog opt-out falls back to closing the SDK, and a grant that throws leaves the adapter off ([ADR 0027](../../../docs/adr/0027-the-app-sends-telemetry-through-two-ports-with-no-failure-channel.md)). `record` sends `event.name` and `event.properties`, omitting the map when it is empty, and nothing else. **Both SDKs are configured in Dart and never from the platform manifests**: PostHog would otherwise initialise itself from `onAttachedToEngine`, ahead of the consent gate ([ADR 0028](../../../docs/adr/0028-telemetry-consent-is-asked-twice-and-answered-asymmetrically.md)). The Sentry adapter records a replay only around an error, masks every text and image, and masks whole any widget whose `Type` is in its `maskedWidgets`; it cannot name those types itself, because they live in `ui/`, so the composition roots pass them in ([ADR 0029](../../../docs/adr/0029-diagnostic-reports-carry-a-masked-session-replay.md)). `maskingDecision` is the callback itself and is public, so its test hands it real elements from a pumped tree |

## `github/`: the second scraper

There are two scrapers on purpose, and whoever changes one changes the other
([ADR 0011](../../../docs/adr/0011-keep-the-apps-own-scraper-for-now.md)). They are **not** line-for-line
equivalent, and the differences are the whole reason this section exists:

| | Web ([`web/src/infrastructure/github/`](../../../web/src/infrastructure/github)) | App (here) |
| --- | --- | --- |
| URL range | no query at all when no year is asked for (the live SVG-embed path); otherwise `from`, plus `to` only for a past year | **`from` and `to` always**, so the current year is closed at 31 December |
| `User-Agent` | a desktop Chrome string | `ContribKit/1.0 (Flutter)` |
| `X-Requested-With` | `XMLHttpRequest` | not sent |
| A `<td>` with no `id` | kept, `count: null` | kept, `count: null` |
| A day outside the requested year | kept | **dropped** (`date.year != year.value`) |
| Missing `data-level`, or one that is not a single digit | day dropped, grid backfills it | derived by `ContributionLevelService` |
| A single-digit `data-level` above 4 | clamped | clamped |
| `data-date` that is not a bare ISO day | dropped | dropped |
| A grouped Count (`1,234`) in the tool-tip | separators stripped, read in full | separators stripped, read in full |
| Unknown Count | `null` | `null` |
| HTTP 429 | `rateLimited(…, retryAfterSeconds)` | `RateLimitedFailure`, with `resetAt` from `Retry-After` |
| Timeout | 20 s → `network` | 20 s → `NetworkFailure` |
| What else becomes a network failure | whatever `fetch` or `response.text()` throws, or a status that is not OK besides 404 and 429; the parse runs outside the `try` | an `IOException` or an `http.ClientException` from the request, or a status other than 200, 404 and 429, and nothing else; the parse runs outside the `try` |
| Grid construction | in the domain layer | in the domain layer, `ContributionGridService` |

**Two passes over the HTML, joined on the `<td>`'s `id`.** Pass one collects `(date, level?, id?)` from every `<td>`
carrying `ContributionCalendar-day`; pass two builds `id → count` from every `<tool-tip for="…">`, taking the
leading digits of its text. A tool-tip with no leading number is skipped, so the day's Count is `null` rather than a
zero nobody measured. `data-level` is authoritative wherever the parser finds a single digit.

The test file pins the transport scope: a socket error, a lost connection, and a `StateError` that must come out as a
`StateError`, because the background isolate skips a `NetworkFailure` (`DiagnosticReportService.warrants` answers
`false` for one) and would never report a defect wearing that type.

### The cache

- **Box `contribution_cache_v3`, keyed `<username>:<year>`.** Changing what a cached calendar *means* requires
  bumping that name; `legacyContributionCacheBoxNames` lists every previous one, and [`app/lib/main.dart`](../main.dart) deletes them at
  startup ([ADR 0014](../../../docs/adr/0014-cached-calendars-are-versioned.md)).
- **An entry written before its Year ended expires after 1 hour. One written after its Year ended never expires**,
  because a finished Year cannot change. The check compares the entry's `cachedAt` with the end of its Year, not
  today's date with the Year, so a snapshot taken on 31 December still expires in January; the repository takes a
  `now` so the rule has a test.
- **The key is lower-cased, because GitHub treats a Username case-insensitively**, so `Torvalds` and `torvalds`
  share one entry, and one `invalidateCache` clears both. `Username` still carries what the person typed: the
  normalisation belongs to the key, not to the value object, which stays display-faithful. `_readCache` takes the
  `Username` it was called with rather than rebuilding one from the key, so a cache hit carries the spelling the
  person typed, as a fresh fetch does.
- `invalidateCache(username)` deletes every key with that Username's prefix, so it clears all years at once.
- **A cache hit builds the same lattice as a fresh fetch.** `_toDomain` flattens the stored weeks back to days and
  hands them to `ContributionGridService`, rather than trusting the shape it read.

## `contact/`: the first call to our own server

`HttpContactMessageRepository` posts a Contact Message to `${Embed.origin}/api/contact`, which is this project's own
Worker ([ADR 0030](../../../docs/adr/0030-contact-messages-leave-through-cloudflares-send-email-binding.md)). That
does **not** reopen [ADR 0011](../../../docs/adr/0011-keep-the-apps-own-scraper-for-now.md): the contributions scrape
is still a direct GitHub call, and this is a surface the app could not implement on its own, because sending mail
needs a binding only a Worker has. It takes an `http.Client` or owns one and exposes `close()`, exactly like
`GitHubContributionRepository`, and its provider is `keepAlive` for the reason [`ui/di/`](../ui/di/AGENTS.md) gives.

| Situation | Result |
| --- | --- |
| `IOException` or `http.ClientException` around the request, including the 20 s timeout | `NetworkFailure` |
| status 429 | `RateLimitedFailure`, `resetAt` from `RetryAfter` |
| any other non-2xx | `DeliveryFailure`, carrying the body's `error` field or the bare `HTTP <code>` |
| anything else thrown | **propagates untouched** |

**A `DeliveryFailure` never carries the platform's wording**, because the server does not send it: `/api/contact`
answers the fixed sentence `"Could not send your message"` and logs the reason itself. What arrives here is already
public copy.

## `http/`: one `Retry-After` parser, every reader

`RetryAfter.resetAtFrom` handles both forms the RFC allows: an integer count of seconds added to the `now` its
caller passes, or an HTTP date through `HttpDate.parse`, falling back to ISO-8601. Anything neither can read leaves
`resetAt` as `null`, which the UI has to tolerate. Both HTTP repositories take a `now` that defaults to
`DateTime.now` and that their providers fill from `clockProvider`, so a test pins the instant a reset lands on.

## `persistence/`: settings

`HiveSettingsRepository` over the `settings` box. `load()` fills the Cell Shape, Cell Size, theme mode and Telemetry
Consent with their defaults and leaves the rest `null` when unset; a stored Year after the year of its `now`, which
only a clock set back can produce, reads as unset. **Every field tolerates its own corruption**:
`_tolerating` wraps each read, so a `cellShape` written as an `int` by an older build costs you the Cell Shape and
nothing else. `loses only the corrupt value` in
[`settings_repository_impl_test.dart`](../../test/infrastructure/persistence/settings_repository_impl_test.dart) is the only test that proves it; the other two in that group pass whether the
tolerance is per-field or wholesale.

**The outer `try` is a backstop, not the mechanism.** It wraps `_settingsIn` as well as the box open, so a field
added without `_tolerating` degrades the whole object to `const AppSettings()` rather than throwing a raw
`TypeError` out of this layer. That is the lesser of two bad outcomes, not the intended one: wrap the new field.
`_write` wraps any failure in `CacheFailure`.

The stored keys, and the two that carry a legacy fallback:

| Key | Legacy fallback | Stored as |
| --- | --- | --- |
| `lastUsername` | - | `String` |
| `lastYear` | - | `int` |
| `paletteKey` | `paletteName` | `String` |
| `cellShape` · `cellSize` · `themeMode` | - | the enum's `name` |
| `backgroundPreset` | `cardBackground` | the enum's `name` |
| `telemetryDiagnosticReports` · `telemetryUsageEvents` | - | the enum's `name` |

**Four helpers carry what a key needs.** `_enumByName` is the one enum-by-name lookup, `_readWithLegacy` /
`_writeReplacingLegacy` are the migration pair, so a legacy fallback is one read and one write rather than a `??` in
one place and a `delete` in another, and `_tolerating` is the per-field guard. Renaming a key means adding the
legacy fallback **and** a migration test in the same commit, or a person silently loses the setting.

## `export/`

One repository per Export Format, each returning bytes and each converting its own failures to `ExportFailure`.
`SvgExportRepository` touches nothing but `dart:convert` and this project's own domain, and its test pins the
document size (including the trailing gap the width subtracts and the web does not), the `<title>`, one Cell per
Contribution Day, `isDark: true` keeping `noneLight` out of an Export, the `unknown` wording for a Count nobody
measured, and every Cell Shape. `PngExportRepository` paints on a `dart:ui` canvas, which `flutter test` reaches
through the Skia software path; [`png_export_repository_impl_test.dart`](../../test/infrastructure/export/png_export_repository_impl_test.dart)
decodes what it emits. Its `byteData == null` arm cannot be reached from outside, and is the one line here nothing
covers. `MarkdownExportRepository` builds an **Embed URL** through `Embed.urlFor` and needs no renderer at all.

**`PlatformExportDelivery` is where the Export stops being ours.** The share sheet and the clipboard sit behind
`ExportDeliveryRepository`, two methods wide, because `SharePlus.instance` is a `static final` memoised from
`SharePlatform.instance` and no test can stand in front of it; `exportDeliveryProvider` is what a test overrides.
`shareFile` answers whether the share went through: `false` only when the person dismissed the sheet, `true` for a
completed share and for a platform that cannot report the outcome, so `exportShared` counts Exports that left the
app rather than sheets that were opened. It converts nothing, so a `PlatformException` from the share sheet or the
clipboard reaches `ExportSheet` raw.

**`XFile.fromData(name: …)` does not name the file.** On the io implementation `XFile.name` is a getter over
`_file.path`, and a data-backed `XFile` has no path, so `share_plus` sees an empty name and falls back to a UUID.
`ShareParams.fileNameOverrides` is the field that carries it, and the test asserts the path the share channel is
handed ends with the name we meant.

**A test that breaks Hive has to swallow one stray error.** `_write` converts anything the box throws into a
`CacheFailure`, and the only way to make an open fail from outside is to point `Hive.init` at a path that is a
file. Hive caches the failing open future inside `HiveImpl` and nothing ever awaits that copy, so the exception is
also reported to the zone as unhandled and fails the test beside the assertion that just passed.
[`settings_repository_impl_test.dart`](../../test/infrastructure/persistence/settings_repository_impl_test.dart) wraps that one case in `runZonedGuarded` for exactly that reason, and
for no other.

## `tip/`

`RevenueCatTipRepository` maps every SDK error to `TipFailure`, and exposes Tip Products and a `give` call and
nothing that reports entitlement ([ADR 0009](../../../docs/adr/0009-tips-are-unconditional-and-unlock-nothing.md)).

**The cancellation check lives in [`store_error.dart`](./tip/store_error.dart), because the SDK helper throws.**
`PurchasesErrorHelper.getErrorCode` is `num.parse(e.code).round()`: it throws `FormatException` on any
non-numeric code, and Flutter raises `PlatformException(code: 'channel-error')` on a channel fault. Called from
inside `on PlatformException catch`, that `FormatException` does **not** fall into the sibling `catch (e)`.
`isTipCancellation` parses the code itself first and returns false for anything non-numeric or negative, so the
helper is only ever handed input it can survive. It is a separate module because it is the one part of this file
with a seam, and it carries its own tests.

**`Purchases.purchase` throws a `PlatformException`, never a `PurchasesErrorCode`**, which is a plain enum nothing in
the package throws, so an `on PurchasesErrorCode` clause would match nothing and no analyzer or test would say so.
The conversion the package documents is `PurchasesErrorHelper.getErrorCode(PlatformException)`: the cancel code
becomes `TipOutcome.cancelled`, anything else a `TipFailure`.

**There is no seam here.** Every entry point is a static `Purchases` call and `Offering` / `Package` /
`StoreProduct` are concrete classes, so its test can only answer on RevenueCat's method channel, which ties it to
the SDK's wire shape. That is the reason to be suspicious of this file specifically.

## Gotchas

- **`app/lib/main.dart`'s WorkManager isolate goes through `HiveSettingsRepository`.** It constructs its
  repositories by hand, because a background isolate has no `ProviderScope`, but it knows no storage key, and
  `HomeScreenWidgetRefresh` owns the order of the reads: see the rename gotcha in the
  [root guide](../../../AGENTS.md#gotchas).
- **`_toDto` builds the DTOs, and the DTOs generate both directions**; see [`github/dtos/`](./github/dtos/AGENTS.md).
- **`yearMax` is computed over the days actually present**, so a derived level depends on the rest of the year. Two
  partial fetches of the same year can disagree about a day's level: another reason a parsed `data-level` is
  preferred wherever it exists. On the cache path it is computed **lazily**, because `_toDto` always writes a
  `level` and so the fallback never fires for an entry this version wrote; it stays for entries written before the
  field existed.
