# Coding standards

What a review checks a diff against. The words are the ones [CONTEXT.md](./CONTEXT.md) defines, the reasons are in
[docs/adr/](./docs/adr/), and what an implementer needs while working is in the `AGENTS.md` guides.

**hard** marks a rule whose breach is a defect: report it with the rule. **judgement** marks a call the reviewer
weighs against the diff: report it as a question. A rule here outranks the smell baseline; where it endorses
something a smell would flag, the case is listed under *Deliberate overrides of the smell baseline* at the end.

## Tooling already enforces

No rule below restates these, and a diff that breaks one fails CI:

- Biome ([`web/biome.json`](./web/biome.json)) over `web`, `docs`, `.github` and `scripts`: formatting, import order,
  the recommended rules, `console` outside the logger, writes to `document.cookie` outside `cookie.ts`, and
  `!important` outside `reset.css`.
- `dart analyze` over [`app/analysis_options.yaml`](./app/analysis_options.yaml): `flutter_lints` (`==` with
  `hashCode` included), `riverpod_lint`, strict casts, inference and raw types, package imports, positional
  booleans, unawaited futures, directive and constructor ordering, and the `Container` rules.
- `tsc` over `astro/tsconfigs/strict` and `astro check`, which make a `Record` or a `switch` over a closed union
  exhaustive, and the coverage floors in `web/vitest.config.ts` and `app/tool/check_coverage.dart`.
- vitest itself: a test that reaches `cloudflare:workers`, `cloudflare:email` or `astro:env/server` without a
  `vi.mock` does not resolve.
- commitlint ([`commitlint.config.cjs`](./commitlint.config.cjs)), on `commit-msg` and on the pull request title:
  Conventional Commits and package scopes.
- The tests that pin behaviour: the semantics and text-scaling sweeps, the Dart and Kotlin seam, the Usage Event
  property types, `AppSheet`'s shape, the `Selector` walk in the e2e suite and in `dom-contract.test.ts`,
  `EMBED_ROUTE`'s reach, and the route failure boundary.
- `pnpm test:docs` ([`docs/docs-consistency.test.ts`](./docs/docs-consistency.test.ts)), which holds every document
  to the claims it can check and holds the code to these:
  - no comment in hand-written source (the Dart in `app/lib`, `app/test` and `app/tool`, the Kotlin, the TypeScript
    and Astro in `web/src`, `web/e2e` and `docs`, the web configs, the scripts, the HTML of an `.astro` file and the
    CSS under `web/src`), doc comments included, bar the tool directives `// @vitest-environment` and
    `/// <reference>` ([ADR 0021](./docs/adr/0021-the-source-carries-no-comments-and-the-documents-carry-the-reasons.md));
  - one TypeScript argument passed positionally and two or more as one object, in `web/src`, `web/e2e` and `docs`
    alike: no function takes two positional parameters, and no `…Params` type or inline parameter type declares a
    single field of its own;
  - which layer imports which, in both clients: the app's pure core free of Flutter, Riverpod and the platform, its
    domain importing only `dart:math` and itself, and `app/lib/ui` reaching `infrastructure/` only from `ui/di/`; the
    web's domain, its tests aside, importing only itself and `@shared`, `ui/` importing neither `@application` nor
    `@infrastructure`, an import that leaves its layer written with the alias and one that stays inside it written
    relative, and none written out of `web/src`;
  - the glossary's code-shaped terms and its policed plain words as identifiers, in `web/src`, `web/e2e`, `app/lib`
    and `app/test`, bar the SDK seams and their own tests, and the web's copy (the text and labels of every `.astro`
    page, the string literals of every other source file) free of those plain words and of `monitoring`, and of a bare
    "widget";
  - `shadcn_ui` inside `ui/widgets/`, the theme and the composition root;
  - in the app: every class outside `ui/` `final`, `sealed`, `abstract final` or `abstract interface`, every
    repository an `abstract interface class`, every use case taking its repository as `{required this._repository}`
    and catching nothing, no `switch` over a `Failure` with a `_` or `default` arm
    ([ADR 0004](./docs/adr/0004-typed-failures-instead-of-thrown-exceptions.md)), `dynamic` only in
    `infrastructure/`, no `firstWhere` without an `orElse`, no date stepped by a `Duration` of days, no calendar day
    built with a local `DateTime(` or parsed into one in `domain/` or `infrastructure/` bar the cache stamp, the Year
    boundary and a reset time, no `MaterialApp`, no clock read (`DateTime.now`) in `domain/`, and in `app/lib/ui`
    outside `ui/theme/` no colour or `Duration` literal and no read of a `colorScheme`;
  - on the web: no class, no `Math.random`, no `toISOString().slice(0, 10)`, no clock read (`new Date()`, `Date.now()`)
    in `domain/`, no `default` arm in a `switch`, every robots directive written through `RobotsDirective`, every
    `fetch` given the shared timeout, no custom property registered with `@property` in the CSS or an `.astro` file,
    `FailureKind` read outside tests only in `domain/failures/`, `application/http/failure-http.ts` and
    `ui/utils/contribution-errors.ts`, a module-level `/g` regex never driven by `.exec` or `.test`, `astro:env` never
    read in `infrastructure/`, React and `.tsx` only in `infrastructure/email/`, the logger called and the server-error
    threshold compared only in `application/http/failure-log.ts`, every `.ts` route exporting `prerender = false` and
    wrapping its handler in the failure boundary, and every page rendering through `BaseLayout`, Zod imported only from
    `astro/zod` and never declared a dependency of `web/`, every module-level schema named `<concept>Schema`, no
    `schema.validate` on a schema that catches, defaults, transforms or coerces, every `.json()` body read into
    `unknown` or straight into a schema, and `window.__INITIAL_DAYS__` declared `unknown`;
  - every sheet under `app/lib/ui/features` in both the semantics and the text-scaling sweep, and `@smoke` only in
    `web/e2e/smoke.spec.ts`;
  - in the web's tests, every `vi.stubGlobal`, `vi.stubEnv`, `vi.spyOn` and `vi.useFakeTimers` in a test file undone
    by `vi.unstubAllGlobals()`, `vi.unstubAllEnvs()`, `vi.restoreAllMocks()` (or the spy's `mockRestore()`) or
    `vi.useRealTimers()` in an `afterEach` or `afterAll`, no year read off the real clock and no `Date.now()`
    bracket in a unit test, and no `toHaveBeenCalledWith`, `toHaveBeenLastCalledWith`, `toHaveBeenNthCalledWith` or
    `toHaveBeenCalledOnce` on `recordUsageEvent` or on the vendor spies that stand for it, whose `mock.calls` a test
    asserts as the exact list; in the app's tests, no `DateTime.now`;
  - the twins: the Embed contract, the Contact Message limits and the request timeout in Dart and TypeScript, the Cell
    geometry in Dart, TypeScript and Kotlin, the dark theme's two CSS blocks, and `app/assets/*.json` equal to
    `shared/*.json`;
  - every `uses:` of another repository pinned to a full commit SHA with its version or branch in a trailing
    comment, and no comment in a YAML file (`pnpm-lock.yaml`, which pnpm writes, aside) but that one, a tool
    directive and the line Renovate writes above an entry it adds to `minimumReleaseAgeExclude`;
  - the ADR shape and index; the links, paths and pins of every document, `.github` included; every Mermaid diagram
    held to the `layout: dagre` it was drawn with, so a renderer that defaults to ELK cannot redraw it; the release
    configs; package scripts with no shell substitution; and the workflows, `ci.yml` with no path filter and the docs
    contract ungated.

## Every change

- **hard**: A change carries everything the maintenance contract in [AGENTS.md](./AGENTS.md) and the guide of each
  folder it touches ask of it, in the same commit, and keeps every guardrail those guides
  state: both scrapers changed together, the Kotlin copy of the Cell geometry changed with the Dart, the cache box
  bumped when a cached calendar changes meaning, `logger.ts` and `contract.ts` in step with the sibling
  repositories. A follow-up commit is a promise, not a fix.

## Shared

### Words

- **hard**: Name identifiers, payload fields and user-facing copy with the glossary's words; where code and glossary
  disagree the code changes. The glossary guard reads the web's copy for the plain words it rejects (`purchase`,
  `intensity`, `density`, `monitoring` and the rest of its list, plural included) and for a "widget" that is not a home
  screen widget, and the app's copy and every other glossary term in copy are the reviewer's. The legal pages say Tip
  where a store says in-app purchase. The Usage Event property `product`, which carries a Tip Product's store id, is the
  one stated exception: PostHog's event history and dashboards are keyed on it, so the identifiers say `tipProduct` and
  the key stays.
- **hard**: Spell a type, a field and a port method the same way in both clients
  (`ContributionRepository.fetchCalendar`, `totalContributions`), so the two domains stay diffable concept by
  concept ([ADR 0003](./docs/adr/0003-layered-domain-architecture-in-both-clients.md)). A free function follows its
  language's idiom (`totalFor` in Dart, `totalContributionsFor` in TypeScript). The one field that differs is a rate
  limit's wait, `retryAfterSeconds` on the web and `resetAt` in the app, because one is a duration to forward and the
  other an instant to print; both domain guides say so.
- **judgement**: Name a TypeScript parameter object after the function that takes it, `<FunctionName>Params`, so a
  reader landing on the type finds what takes it; a function handed one record keeps that record's type. Sibling
  functions that take the same input may share one type named for that role (`CellShapeParams` for the Cell Shape
  renderers, `LogParams` for the logger's levels, `MarkdownSnippetParams` for the snippet and the line that shows
  it).
- **hard**: Give a Dart function named parameters rather than two or more positional ones, because adjacent
  arguments of one type get transposed with nothing to catch it; one positional subject may lead named options
  (`compute(calendar, {today})`), and a callback a runtime invokes (`build`, `paint`, a provider function taking
  `Ref`, an SDK hook) keeps its positional signature. Test helpers follow the same rule.

### Imports

- **hard**: Import across layers through the path alias and within one by relative path (a layer is a top-level
  folder of `web/src`: `domain`, `application`, `infrastructure`, `ui` or `pages`), so an alias always marks a
  crossed boundary; mixing both forms for one module breaks Biome's import sorting. No relative path leaves `web/src`:
  a value from a manifest arrives as a build-time constant (`__WEB_VERSION__`, `__APP_VERSION__`). The app imports by
  `package:` path throughout, which its `always_use_package_imports` lint enforces.

### Failures

- **hard**: Give each cause its own kind (a bundled asset fails as `AssetFailure`, GitHub's markup as a parse
  failure, a refused send as a delivery failure), because a kind that means two things tells the reader the wrong
  story ([ADR 0004](./docs/adr/0004-typed-failures-instead-of-thrown-exceptions.md)).
- **judgement**: Construct every kind you declare and read every field you add to one; a field nothing reads is how
  a sealed set rots ([ADR 0025](./docs/adr/0025-how-much-ddd-and-where-it-stops.md)). The detail of an app `Failure`
  (`message`, `AssetFailure.asset`) is the one reader that is `toString`, what a debug console and a failing test
  print: it reaches no screen, because `FailureMessage.of` paints fixed copy, and no Diagnostic Report, because
  `_scrub` replaces every exception value.
- **hard**: Write a failure message that reaches the screen or an HTTP body as public copy, and answer a fixed
  sentence for a kind whose message is a platform's own wording (`Network`, `Delivery`), which goes to the log
  through `reasonFor` instead.

### Counts, totals and figures

- **hard**: Carry an unknown Count as `null`, distinct from a measured `0`, and never estimate it, sum over it or
  print it as exact ([ADR 0019](./docs/adr/0019-an-unknown-count-is-null-in-both-clients.md)).
- **hard**: Decide whether a Contribution Day is active from its Contribution Level, so a coloured day whose Count
  did not parse still keeps a Streak ([ADR 0019](./docs/adr/0019-an-unknown-count-is-null-in-both-clients.md)).
- **hard**: Make Total Contributions, and every figure derived from Counts, `null` as soon as an active day has an
  unknown Count; an unknown Count at level none leaves it intact
  ([ADR 0019](./docs/adr/0019-an-unknown-count-is-null-in-both-clients.md)).
- **hard**: Print Total Contributions through `formatTotalContributions` and a Streak through `formatStreak`, which
  say `unknown` for `null` where plain interpolation prints a guess or the word `null`.
- **hard**: Omit an unknown Count from output (no `data-count`, a Cell Tooltip that says unknown) rather than writing
  `0`.
- **hard**: Take a Year's week count from `weeksFor`, because a leap Year opening on a Saturday needs 54 weeks; only
  the Rolling Window has a fixed width
  ([ADR 0023](./docs/adr/0023-the-app-grid-covers-the-year-in-53-or-54-weeks.md)).
- **hard**: Advertise a size or a figure only by computing it with the function that produces the artifact
  (`ExportGeometryService`, `calendarLayout`), because a typed-in number drifts from the renderer.
- **hard**: Answer an empty scrape with a parse failure, never an empty Contribution Calendar, because a Year of zeros
  is a lie nobody can detect ([ADR 0005](./docs/adr/0005-scrape-githubs-public-contributions-html.md)).
- **hard**: Show placeholder data only to a visitor who asked for no Username, and surface no fetch failure for the
  default one; `generateData` is the one place a Count is invented.
- **hard**: Clear every number from an error state, because zero is a number.

### One rule, one home

- **hard**: Implement a rule once, in `domain/`, and call it from every site that needs it, in every layer and
  surface (`totalFor`, `totalContributionsFor`, `StreakService.currentFor`, `PaletteService.resolve`,
  `statsWithScrapedTotalContributions`, `RetryAfter`, `resolveYear`, `isCount`), because a second copy drifts with nothing to catch
  it.
- **hard**: Build an Embed URL through `Embed.urlFor` or `buildEmbedUrl`, which take the `Username` and omit the
  defaults, because a hand-built URL doubles an `&` or drops the visitor's options.
- **hard**: Add a shared token, a constant or a field in the same change as the code that reads it, because a value
  nothing reads is a claim nothing checks
  ([ADR 0024](./docs/adr/0024-calendar-labels-are-a-web-only-surface.md),
  [ADR 0025](./docs/adr/0025-how-much-ddd-and-where-it-stops.md)).
- **judgement**: Keep one surface per flow and one component per view (`ExportSheet`, `ErrorView`), because a second
  copy kept in step by intention is not kept in step.
- **judgement**: Delete a string duplicated across languages where you can, and pin it with a test only where you
  cannot.

### Values, time and input

- **hard**: Pass `today` or `now` into domain code and read the clock at the edge, so a test can say what day it is;
  in the app the edge reads it through `clockProvider`, the one clock a test overrides.
- **hard**: Keep a value object whole across boundaries (`Username` inside `NotFound` and the Contribution Calendar),
  and unwrap it with `.value` only where it is serialised.
- **judgement**: Before a concept gets a type of its own, ask in order whether the illegal state can be reached,
  whether anything reads it and whether it crosses a boundary; a no to all three means writing the rule down (an
  assert, a guide line, an ADR) instead of encoding it ([ADR 0025](./docs/adr/0025-how-much-ddd-and-where-it-stops.md)).
- **judgement**: Let a port take what it uses, as `svgStringRenderer` takes `days` and not the aggregate.
- **hard**: Keep the Username pattern looser than GitHub's (it accepts `a--b`), because a truthful "username not
  found" beats a false "invalid username".
- **hard**: Keep the Contact Message email rule stricter than the RFC (no whitespace, `<`, `>` or `"`), because it is
  the header-injection guard for `Reply-To`; the body stays unguarded
  ([ADR 0030](./docs/adr/0030-contact-messages-leave-through-cloudflares-send-email-binding.md)).
- **hard**: Validate input before any outbound request, the browser's request to this project's own API included, so
  an invalid Username or Contact Message costs no call.
- **hard**: Give every outbound HTTP request the Worker, the browser and the app make a 20-second timeout
  (`REQUEST_TIMEOUT_MS` on the web, `RequestTimeout` in the app).
- **judgement**: Test a nullable number with `!= null`, because `0` is a fact and not an absence.

### Telemetry and personal data

- **hard**: Build a Usage Event only from closed types (domain enums, value objects, numbers, booleans), because one
  `String` parameter or property is a channel a Username or free text can leave through; the web's Palette key is the
  one `string`, and only as `paletteByKey` resolved it
  ([ADR 0027](./docs/adr/0027-the-app-sends-telemetry-through-two-ports-with-no-failure-channel.md)).
- **hard**: Send a Diagnostic Report with the error's type and stack and never its message, and let its replay show
  every text, image and Cell as a rectangle, because many messages carry a Username or a path
  ([ADR 0027](./docs/adr/0027-the-app-sends-telemetry-through-two-ports-with-no-failure-channel.md),
  [ADR 0029](./docs/adr/0029-diagnostic-reports-carry-a-masked-session-replay.md)).
- **hard**: Store a Contact Message nowhere: a failure log carries the kind and the platform's reason, never the name,
  the address or the message
  ([ADR 0030](./docs/adr/0030-contact-messages-leave-through-cloudflares-send-email-binding.md)).
- **hard**: Read Telemetry Consent through `mayReportDiagnostics` and `mayRecordUsageEvents`, because comparing a
  choice to `granted` makes the asymmetry symmetric
  ([ADR 0028](./docs/adr/0028-telemetry-consent-is-asked-twice-and-answered-asymmetrically.md)).
- **hard**: Keep Tips unconditional: nothing reads whether a Tip was given, and only the sheet that offered a Tip
  branches on its `TipOutcome` ([ADR 0009](./docs/adr/0009-tips-are-unconditional-and-unlock-nothing.md)).

### Recorded decisions a diff keeps

- **hard**: Leave the SVG endpoint outside the rate limiter, because README embeds share one image proxy
  ([ADR 0010](./docs/adr/0010-rate-limit-only-the-json-api.md)).
- **hard**: Parse GitHub's page with the scrapers' regexes, because a Worker has no DOM
  ([ADR 0006](./docs/adr/0006-parse-the-contributions-page-with-regexes.md)).
- **hard**: Keep `noneLight` out of the SVG endpoint and out of Exports, because an embed or an exported image cannot
  know the viewer's theme ([ADR 0012](./docs/adr/0012-light-theme-palette-variant-is-app-only.md)).
- **hard**: Keep the web's hand-written `Failure` union, with no Effect in any layer
  ([ADR 0031](./docs/adr/0031-the-web-keeps-its-hand-written-failure-union-instead-of-effect.md)).

## App

### Domain

- **hard**: Give a value object that can be invalid a constructor or factory that throws `ArgumentError` or
  `RangeError`; the input boundary builds it inside a `try` with `on ArgumentError` and shows its `message`, so
  write that message as copy, and `on Failure` does not catch it
  ([ADR 0004](./docs/adr/0004-typed-failures-instead-of-thrown-exceptions.md)). A value that must stay `const`
  (`Color`, `ContributionStats`) asserts instead ([ADR 0025](./docs/adr/0025-how-much-ddd-and-where-it-stops.md)).
- **judgement**: Put a validating factory in front of a private `const` constructor (`Username._`, `Year._`,
  `ContactMessage._`), so no caller reaches an unchecked value.
- **hard**: Give a value object held in Riverpod state `==` and `hashCode`, because identity equality rebuilds the
  screen on every notification.
- **hard**: Store a collection inside an entity or value object unmodifiable (`List.unmodifiable`,
  `Map.unmodifiable`) and compare it element by element, because collection `==` is identity and a collection
  mutated in place keeps its owner equal to itself.
- **hard**: Make a calendar day a UTC date (`DateTime.utc`) and keep a local `DateTime` for an instant only (now, a
  cache stamp, a reset time): build and parse a day through `CalendarDate`, and read `today` as a day with
  `CalendarDate.of`. UTC has no daylight saving, so no arithmetic on days depends on the device's zone and a test proves
  it in any zone, and a local and a UTC `DateTime` with the same fields are never `==`, so a day made the other way
  misses every lookup ([ADR 0032](./docs/adr/0032-a-calendar-day-is-a-utc-date-in-the-app.md)).
- **judgement**: Give an enum's display label as an exhaustive `switch (this)` getter, so a new case is a compile
  error rather than a `!` on a map.
- **hard**: Draw a Cell from `CellGeometryService.figureFor`: renderers match on the `CellFigure` cases and hold no
  Cell maths of their own ([ADR 0020](./docs/adr/0020-the-cell-geometry-is-the-apps-in-three-languages.md)).
- **hard**: Keep domain colours in the project's `Color` and convert where the colour is painted, through `.argb`; a
  Background Preset converts through `BackgroundPresetPainting`, which owns its fallback.
- **judgement**: Write a domain service as an `abstract final class` of static functions that holds no state and is
  never constructed, as all eight are.

### Application

- **hard**: Write one class per use case with one public method, `call`; a second public method is a second use case.
- **hard**: Take dependencies through a `const` constructor into private final fields, holding no state and reading
  no provider, so a use case builds with a fake and nothing else.

### Infrastructure

- **hard**: Convert every error the platform, an SDK, Hive or IO raises into a `Failure` in this layer, and around an
  HTTP request convert only the transport errors, so a defect in our own code keeps its type; for a new method, ask
  which `Failure` it fails as ([ADR 0004](./docs/adr/0004-typed-failures-instead-of-thrown-exceptions.md)).
- **hard**: Convert eagerly inside the `try`, because a `cast`, `map` or `where` returned from it is lazy and throws
  after the `try` has closed.
- **hard**: Wrap only the request in the transport `try` and turn only `IOException` and `http.ClientException` into
  `NetworkFailure`, so a defect in our own code keeps its type instead of reading as a network error.
- **hard**: Give a method that throws its own typed `Failure` inside a catch-all an `on <Kind>Failure { rethrow; }`
  arm first, so its message is not wrapped twice.
- **judgement**: Sort a copy of a list an SDK hands you.
- **hard**: Persist enums by `name`, so reordering is free; the calendar cache's `level` index is the recorded
  exception, guarded by the box name ([ADR 0014](./docs/adr/0014-cached-calendars-are-versioned.md)).
- **hard**: Keep the two Telemetry adapters swallowing every error and raising no `Failure`, in `start` and
  `applyConsent` as in `record` and `report`, and hand what an SDK throws while it starts or a consent changes to
  `reportTelemetryFailure`, so a broken SDK neither stops the app nor goes unreported. Fail consent closed: stop
  sending before asking the SDK to stop, and leave the adapter off when a grant throws
  ([ADR 0027](./docs/adr/0027-the-app-sends-telemetry-through-two-ports-with-no-failure-channel.md)).
- **hard**: Fail a bundled asset that is missing, malformed or empty as an `AssetFailure` in its repository, because an
  empty list is no failure to a caller that draws what it is given (`ViewerNotifier` holds the same line for a Palette
  list that still arrives empty).
- **hard**: Treat a cache read that throws as a miss and swallow a cache write that throws, because a bad cache entry
  must never make the app unusable.
- **hard**: Declare DTOs `@JsonSerializable()` with generated `fromJson` and `toJson`, so the cache's read and write
  sides cannot drift.
- **judgement**: Read settings once through `load()` and write one setting per call (Telemetry Consent is one
  setting stored under two keys), because one `save(AppSettings)` lets two notifiers clobber each other from stale
  snapshots.
- **hard**: Build a URL to this project's server from `Embed.origin`, the one place Dart spells the origin.

### UI

- **judgement**: Keep business logic out of widgets: past a trivial conditional in `build`, it belongs in a notifier.
- **judgement**: Read state with `ref.watch` and act through `ref.read`, on a notifier method or, in a sheet, on a use
  case.
- **hard**: Guard every state write after an `await` with `ref.mounted` (through `_stillOurs` in `ViewerNotifier`),
  and an entry write when the method can start after its caller is gone.
- **hard**: In a sheet's `State`, write `setState` after an `await` only behind `mounted`, and read every provider
  before the first `await`, because the `ref` of an unmounted `ConsumerState` throws.
- **hard**: Model a sheet's state as a sealed class (`TipJarState`, `ContactSheetState`, `ExportSheetState`), so illegal
  combinations cannot be written.
- **hard**: Turn a `Failure` into text only through `FailureMessage.of` or `FailureMessage.ofAny`; a widget that cares
  about one kind tests it with `is`.
- **hard**: Show `FailureMessage.ofAny` when an `AsyncValue` row fails, and hide the row only while it loads.
- **hard**: Build a Customizer setting as a `SettingPicker<T>` given a label, options and an `optionBuilder`.
- **hard**: Open every bottom sheet through `AppSheet`, which owns the scrim, the motion, the handle, the drag and the
  height cap.
- **judgement**: Give each sheet a `static Future<void> show(BuildContext context, …)` that calls
  `AppSheet.showBottom`, so a caller opens it without knowing how.
- **hard**: Give every tappable control that is not an `AppButton` a `Semantics` node with a label, `button: true`
  (`toggled:` for a switch), `excludeSemantics: true` and `onTap:`, plus `selected:` or `enabled:` where they apply,
  because without `onTap:` it announces itself and cannot be pressed.
- **hard**: Give an icon-only `AppButton` `iconOnly: true` and a `semanticLabel`.
- **hard**: Let text scale: lay rows out with `Flexible`, `Expanded` and ellipsis and leave `textScaler` unclamped,
  because the setting is a person's choice.
- **judgement**: Seed a text controller once through `ref.listen`, because mutating a `ChangeNotifier` in `build`
  refills what a person just cleared.
- **judgement**: Derive Contribution Stats once per Contribution Calendar in the notifier, not in `build`.
- **hard**: Run every optional start-up step in `main()` through `_bestEffort`; only `Hive.initFlutter` may stop the
  app from starting.
- **hard**: Do platform IO (the share sheet, the clipboard) through a repository provider a test can override, never
  from a widget. `HomeScreenWidgetService.update`, which the Viewer's notifier calls statically, and
  `FlutterNativeSplash.remove()` on the Viewer's first frame are the two stated exceptions, because a provider in
  front of a best-effort platform write nobody reads back would buy nothing.
- **hard**: Keep the `catch (_) {}` around the `home_widget` calls in `HomeScreenWidgetService`, because iOS has no
  widget extension.

### Theme

- **hard**: Take every spacing, radius and size from `Tokens`, the incidental ones included. A typographic metric
  (`letterSpacing`, `height`), an opacity and the values an animation runs between are the stated exception: they
  stay literals where they are used, because a token for each would buy nothing.
- **hard**: Read a Background Preset's colour through `colorOr(fallback)`, so no call site re-decides the fallback.
- **judgement**: Give an inline `TextStyle` its `fontSize` from `Tokens`; the monospace face comes from
  `AppTextStyles.mono`.

### DI

- **hard**: Declare every provider with `@riverpod` and commit the generated file.
- **hard**: Return the domain interface from a repository provider, so a test override is one line.
- **hard**: Build a use-case provider from repository providers with `ref.watch`: one repository, one provider, one
  construction site.
- **hard**: Mark a provider that owns an `http.Client` or SDK state `keepAlive`, because a `ref.read` adds no listener,
  so an auto-dispose provider would build a client per read, or close it mid-request if it closed on dispose.
- **hard**: Set `retry: _neverRetry` on a provider that reads a bundled asset, because Riverpod's default retry shows
  loading for about forty seconds instead of the error.
- **judgement**: Put state in a notifier beside the feature that owns it; `ThemeModeNotifier` in `ui/di/` is the one
  exception.

## Web

### Data from outside

- **hard**: Read a value whose shape the types cannot prove (in the browser a response body,
  `window.__INITIAL_DAYS__`, the `ck_user` cookie and the query string; in an endpoint route its query string and its
  body) as `unknown` and check it with a zod schema from `astro/zod` before reading any field of it, never with a
  cast, because a cast checks nothing at run time and a malformed value then fails far from its source: a 200 whose
  body is of the wrong shape, once cast, throws inside `toContributionDays` or draws a garbage calendar, where the
  schema makes it an error state
  ([ADR 0031](./docs/adr/0031-the-web-keeps-its-hand-written-failure-union-instead-of-effect.md)). Name the schema
  `<concept>Schema` after what it checks, declare it beside its one reader (in a module of its own beside its readers
  when several read it, as `non-blank.ts` holds the check `cookie.ts` and `url.ts` share), and infer the type from
  it; check with `schema.validate(value)` where the answer is a yes or no, and with `schema.safeParse(value)`
  (`schema.parse(value)` when every field falls back through `.catch`) where the caller reads the parsed value or the
  issue. The domain rule that owns a value decides its meaning after the schema, or in its place where the types
  already prove the shape (`contributionDay`, `resolveYear`, `parseUsername`, `parseYear`), and a rule two layers
  share is a domain predicate each schema refines with (`isCount`), because the domain cannot import Zod. The
  layout's own scripts, which only test a value against a closed set, stay Zod-free. The docs contract checks the
  bodies, `__INITIAL_DAYS__` and the schema names, so the cookie and the query string are the reviewer's.

### Domain

- **hard**: Return failures as values, `T | Failure`, and never throw; `colorOrThrow` at module load is the one
  exception, so a malformed Palette token fails the build
  ([ADR 0004](./docs/adr/0004-typed-failures-instead-of-thrown-exceptions.md),
  [ADR 0031](./docs/adr/0031-the-web-keeps-its-hand-written-failure-union-instead-of-effect.md)).
- **hard**: Build a value object that can be invalid through a `parse*` function returning `T | Failure`, with an
  `is*` guard; the rest of `value-objects/` is total and clamps or defaults.
- **judgement**: Build a value with a factory function that returns readonly data, so a caller cannot change what the
  domain handed it.
- **hard**: Build a `ContributionDay` from raw input only through `contributionDay`, which clamps the level; data from
  the JSON API enters the domain through it, never through a cast. Code that assembles a day from parts already typed
  (`emptyDay`, the grid walk) builds it directly.
- **hard**: Turn a `Date` into an ISO date through `toIsoDate` and parse one at local noon, because both halves stay
  local or the pair stops round-tripping.
- **hard**: Let a scraped total beat a computed sum only through `statsWithScrapedTotalContributions`.
- **hard**: Take render geometry from one `calendarLayout` call; a renderer computes no dimension, position or radius.
- **hard**: Hand days to a renderer through a grid builder, `buildGridFromApi` for a Year and `buildRollingGrid` for
  the Rolling Window, because `chunkWeeks` alone transposes GitHub's weekday-major table.
- **hard**: Pass `renderCellShape` only trusted attribute strings, because it interpolates them verbatim.

### Application

- **hard**: Curry a use case as `useCase(dependencies)(params)` and bind the dependency at module scope in
  `pages/_contributions.ts` or `pages/_contact.ts`, typed as the repository's own method type.
- **judgement**: Keep a use case only when it binds something; one that only forwards is deleted.
- **hard**: Map a `Failure` to a status, a message, a field, a JSON error body and a `Retry-After` only in
  `application/http/failure-http.ts`, and keep `STATUS_BY_KIND` a `Record<Failure["kind"], number>` so a new kind
  fails to compile ([ADR 0031](./docs/adr/0031-the-web-keeps-its-hand-written-failure-union-instead-of-effect.md)).
- **hard**: Keep the Username out of a `NotFound` answer, because that string is rendered into an error page and an
  SVG body.
- **hard**: Emit `Retry-After` only when upstream named a wait: `0` is an answer and `null` is none.
- **judgement**: Declare a port in the layer that needs it and let infrastructure satisfy it structurally, as
  `FailureLogger` is.
- **hard**: Take every `Cache-Control` value from `application/http/cache-control.ts` (`CACHEABLE_ANSWER`,
  `NOT_CACHEABLE`, and the landing page's `PRIVATE_CACHEABLE_ANSWER` and `PRIVATE_NOT_CACHEABLE`), decided after the
  answer is known: only an answer that carries data is cacheable, and every failure answer is `no-store`.

### Infrastructure

- **hard**: Turn a network error, a non-OK status or unparseable HTML into a `Failure` here, guarding
  `response.text()` as well as `fetch`, because the timeout aborts the stream too.
- **hard**: Keep the scraper's matches tolerant, `ContributionCalendar-day` anywhere in the attributes and `\s*`
  before a tool-tip's digits, because GitHub reorders attributes and reformats markup.
- **hard**: Put the visitor's address in `Reply-To`, never `From`, and replace CR and LF in every MIME header value
  ([ADR 0030](./docs/adr/0030-contact-messages-leave-through-cloudflares-send-email-binding.md)).

### Pages

- **hard**: Take a value from a closed set (a tone, an icon, a status) from its const object, never a bare string, so a
  typo fails the typecheck.
- **hard**: Match a closed set in a `switch` that names every member and carries no `default` arm, so a member added to
  the set leaves a variable unassigned or a function without a return where it is matched (`DaySource` in
  `index.astro`).
- **hard**: Compose repositories and use cases at module scope in an underscore-prefixed module, because `.astro`
  frontmatter runs on every request.
- **judgement**: Keep rules out of routes and frontmatter: request policy is a function vitest can import, as
  `resolve-initial-view.ts` is.
- **hard**: Wrap each endpoint route's handler in a `try`/`catch` that logs through `logServerError` and answers
  `SERVER_ERROR_MESSAGE` in the route's own body shape, never the thrown message.
- **hard**: Keep published payload keys (`total`, the `cells` alias, `user`, and an error body's `kind`, whose values
  are the `Failure` kinds) until a release that says it removes them
  ([ADR 0004](./docs/adr/0004-typed-failures-instead-of-thrown-exceptions.md)).
- **hard**: Keep the SVG endpoint degrading to defaults for a bad `palette`, `shape` or `background` and ignoring
  `year`, while the JSON endpoint rejects, because an `<img>` cannot read a 400.
- **judgement**: Keep decorative copy on the error pages free of anything that reads as a real identifier.

### UI

- **hard**: Keep components props in, markup out; behaviour lives in `ui/utils/page-init.ts` or in a colocated
  controller that one `<script>` calls, where vitest can reach it. An `is:inline` head script that must run before
  first paint (the theme bootstrap) is the exception.
- **hard**: Spell every id and class that crosses `.astro` and `.ts` once, in `ui/utils/dom-contract.ts`, and read it
  through `ElementId`, `ClassName` or `Selector` on both sides, the e2e suite and the unit tests' fixtures included; a
  utility class from `styles/base/base.css` (`mono`) is spelled where it is used. A test asserts what is already out
  there (a status, a header, a meta tag, a body the site publishes) as a literal, because that literal is the oracle
  that catches a change breaking a public contract; a hook the test only locates an element or a value by (an id, a
  class, a selector) is read from its one declaration.
- **judgement**: Let a renderer skip a node the page does not carry (`if (el)`) rather than throw, because one
  controller serves several pages; the e2e `Selector` walk is what proves each page carries the nodes it needs.
- **hard**: Take Palette colours and Cell Shapes from `@domain/value-objects/`, never as a hex literal or a bare shape
  string.
- **hard**: Guard a DOM `dataset` value where it is read (`isCellShape`, `paletteByKey`, `isExportFormatKey`,
  `isIsoDate`, `isCount`) and hand renderers the typed value.
- **hard**: Draw icons as inline SVG components, because the CSP refuses an icon font or a CDN.
- **judgement**: Colocate a component's CSS in its folder.
- **judgement**: Give each global CSS layer in `ui/styles/` a folder whose `index.css` only imports, and size there in
  `rem`, with `px` only inside `@media`.
- **hard**: Interpolate form limits from the domain's constants and validate fields with the domain's per-field rules,
  so the browser refuses what the server would.
- **hard**: Hide the honeypot with the `.field--trap` class plus `tabindex="-1"`, `autocomplete="off"` and
  `aria-hidden="true"`, because bots leave `type="hidden"` alone.
- **hard**: Pass values into an `is:inline` script through `define:vars` from their one declaration.
- **hard**: Record a Usage Event after the render, from the guarded values the renderer used; a counted link declares
  itself through `usageEventAttributes`.
- **hard**: Check each vendor's consent inside every `recordUsageEvent` call, so a consent change applies to the next
  event without a reload.
- **hard**: Let `recordUsageEvent` swallow a missing global or a throwing vendor, because recording an event must never
  break the click it records.
- **hard**: Set `aria-checked` or `aria-selected` and the `.active` class in the same function, so the CSS and the
  screen reader agree.
- **hard**: Make a navigating call to action an `<a href>`.
- **hard**: Express a tone through tokens: a new tone is a class and a token block.
- **judgement**: Run no side effect at module scope in a browser module; `initPage` does the initialising.
- **hard**: Show in a preview exactly what its copy button copies.

## Tests

- **judgement**: Put the why of a non-obvious Dart assertion in its `reason:`; a `reason:` may narrate the scenario it
  sets up, but neither it nor a test title, in either language, tells the history of the code ("used to", "was
  fixed").
- **hard**: Override dependencies with `ProviderScope(overrides: [...])` at the `ui/di/` providers, the two Telemetry
  ports included; a use case faked any other way means the wiring skipped that file.
- **hard**: Assert the Usage Events a flow records as the exact list, in order, so an extra, a missing or a reordered
  event fails.
- **hard**: Find a failure's text on screen through `FailureMessage.of`, never a literal, so a copy change moves the
  test with it.
- **hard**: Hold an in-flight state with a `Completer` the fake awaits, never with a wait on the clock.
- **hard**: Undo in an `afterEach` (an `afterAll` for a change made once for the whole file) whatever a test changes
  outside itself (in a web test, a stubbed global or environment variable, a spy, the fake clock, a listener
  installed on `document` or `window`), because a line at the end of a test body never runs once an assertion above
  it fails and the change leaks into every later test in the file.
- **hard**: Pin the clock a case depends on (in a web test, an injected `today`, or
  `vi.useFakeTimers({ toFake: ["Date"] })` with `vi.setSystemTime`, undone in an `afterEach` or `afterAll`; in a
  Dart test, a `today` or `now` passed in, or `clockProvider` overridden, which `appOverrides` does with `testToday`)
  and assert the exact instant or year it yields, because a bracket between two readings of the real clock passes
  whatever the code computed in between and a year read off it moves the expected value every January.
- **judgement**: Open a sheet under test through a route (`pumpSheet`, the sheet's `show`), never by mounting it bare,
  because the route is what gives it its scrim, height cap and semantics.
- **judgement**: Give a function that does IO an optional dependency defaulting to the real one, as its test seam
  (`renderFromGitHub`'s `request`, `HomeScreenWidgetRefresh`'s writer).
- **judgement**: Pin a formula with literal numbers in its own test, because a test that calls the function it checks
  catches only a divergence.
- **judgement**: Build values under test through the production factory, because `const` instances are canonicalised
  and pass an equality test by identity.
- **judgement**: Test a sealed state's transitions without a `WidgetTester`.
- **judgement**: When two paths leave the same state, assert on the collaborator, as counting the repository's reads
  does.
- **judgement**: Add no test that appears to pin a guard it cannot observe, because it passes for the swallowing and
  not for the guard.
- **judgement**: Cover each piece `main()` assembles and leave the bootstrap itself untested, because a test of it
  only asserts that mocks were called.
- **hard**: Tag a case `@smoke` only for what proves the Worker answers on every deploy, never a result that depends
  on the caller's address, and keep the three cases every repository that deploys runs (a titled homepage, an
  unknown path answering 404, `robots.txt` served) word for word, because a failing smoke run rolls production back.
  `/user/<name>.svg` is this repository's fourth, the one route that cannot be prerendered and so the one that tells a
  running Worker from a bucket of assets, asked for `/user/foo_bar.svg` and asserted word for word, because the
  Worker refuses that Username before any request leaves it and an outage at GitHub must not roll back a healthy
  deploy.
- **hard**: Assert an e2e response's status before reading a success-path header or body.

## Workflows

- **hard**: Every `uses:` names a full commit SHA with its version in a trailing comment, or its branch for a pin
  that follows one, and the two move together: the SHA is what runs, the comment is the only thing that makes it
  legible, and Renovate maintains both halves.
- **hard**: YAML carries no explanatory comments; the reason for a line goes in the commit message, the pull request,
  an ADR or a rule here, and a gotcha an implementer would otherwise trip on goes in the *Gotchas* of
  [AGENTS.md](./AGENTS.md). The trailing comment on a SHA pin is the one exception.

## Docs and commits

- **hard**: Keep `CONTEXT.md` to vocabulary: the term, one or two sentences on what it is, and the words it displaces,
  never how it is built, because mechanism belongs to the folder guide or an ADR.
- **hard**: State a rule once: a rule about how code is written here, a coupling or a gotcha in the guide of the
  folder it bites, a decision in an ADR; a wiki page says where the rule lives, because `docs/wiki/` is published and
  nothing checks a copy.
- **hard**: Write a guide in the present tense, holding what an implementer needs while working; the reason for a
  line goes in the commit message, the pull request, an ADR or a rule here, and history ("used to", "was",
  "until …") stays in git, because a guide is loaded into every session that works in its folder
  ([ADR 0021](./docs/adr/0021-the-source-carries-no-comments-and-the-documents-carry-the-reasons.md)).
- **judgement**: Propose an ADR only for a decision that is hard to reverse, surprising without context and the
  result of a real trade-off, and link it from where it bites.
- **hard**: Say in the commit message when a change guards rather than fixes, and call a test that builds an
  unreachable state on purpose a guard, so the next reader does not mistake it for a reproduction
  ([ADR 0025](./docs/adr/0025-how-much-ddd-and-where-it-stops.md)).
- **hard**: Keep each docs-test assertion one aggregated failing list per rule, rather than an `it.each` per
  document, so one run names everything that drifted.
- **hard**: Guard every list a docs-test assertion derives from the repository (files, rows, matches) with a
  non-empty assertion or a synthetic self-test, because an assertion over an empty census passes whatever the tree
  holds.
- **hard**: Prove a new docs-test assertion by breaking the code it guards and watching it fail, permuting a pair
  rather than only renaming a token, because an assertion that never failed advertises coverage it lacks
  ([ADR 0015](./docs/adr/0015-the-maintenance-contract-is-enforced-by-a-test.md)).
- **hard**: Delete a gotcha, or an entry under *Known inconsistencies* in [ARCHITECTURE.md](./ARCHITECTURE.md), in the
  change that resolves it, because a stale entry is a false claim about the tree.

## Deliberate overrides of the smell baseline

- **Duplicated Code**: the domain written twice
  ([ADR 0003](./docs/adr/0003-layered-domain-architecture-in-both-clients.md)), the two scrapers
  ([ADR 0011](./docs/adr/0011-keep-the-apps-own-scraper-for-now.md)), the Cell geometry in Dart, TypeScript and
  Kotlin ([ADR 0020](./docs/adr/0020-the-cell-geometry-is-the-apps-in-three-languages.md)), the Embed contract and
  the Contact Message limits in two languages, and the dark theme's two CSS blocks are twins the docs contract holds
  equal: flag a twin that changed alone, not the pair. Also deliberate: the loops of the two SVG renderers, since a
  shared walk needs a five-field config; the CR and LF guard in both the email rule and `mime.ts`; and the separate
  `LEVEL_THRESHOLDS` and `CELL_SIZE` in `mini-grid.ts`, `calendar.ts` and `ContributionCode.astro`, which only look
  alike.
- **Duplicated Code**: `logger.ts` is byte for byte what the sibling repositories carry and `contract.ts` differs from
  theirs only in `LOG_SERVICE`, so a change to either is made in all three
  ([ADR 0026](./docs/adr/0026-observability-is-cloudflares-exported-to-better-stack.md)).
- **Duplicated Code**: the stated-version helpers (`VERSIONED_DEPENDENCIES` through `declaredIn`) and the
  release-config helpers (`BREAKING_PARSER_OPTS` through `parserOptsOf`) in `docs/docs-consistency.test.ts` are byte
  for byte the same in biancafiore, contribKit and github-star-tracker, so a change to one is made in all three.
- **Duplicated Code**: the three smoke cases are word for word the same in every repository that deploys, so a
  difference between them is drift, not a variant.
- **Shotgun Surgery**: a change to fetching or parsing edits both clients, and a change to a cross-language constant
  edits every spelling, by design.
- **Middle Man**: the app's one-line use cases stay, so a rule between a widget and a repository has a home;
  `AppCard` and `AppTooltip` stay, because they keep `shadcn_ui` out of features. On the web the smell applies and a
  forwarding use case is deleted.
- **Speculative Generality**: the six Contribution Stats figures with no reader stay, because the glossary defines
  them; `Tokens` and `AppButtonSize` stay complete scales; `ContributionLevelService` keeps its unreachable
  `yearMax == 0` arm as a total function's answer; the `ref.mounted` guards no test can observe stay. A dead
  parameter, or a wrapper with no caller, is still deleted.
- **Data Clumps**: the `ContributionStats` pairs (`bestDayCount` with `bestDayDate`, `bestMonth` with
  `bestMonthContributions`) are asserted in the constructor, not wrapped in a type
  ([ADR 0025](./docs/adr/0025-how-much-ddd-and-where-it-stops.md)).
- **Primitive Obsession**: the web's `cellSize` is pixel geometry, because a named Cell Size exists in the app only
  ([ADR 0016](./docs/adr/0016-cell-size-is-a-named-choice-in-the-app-and-fixed-geometry-on-the-web.md)).
- **Repeated Switches**: an exhaustive `switch` over a sealed type or an enum is the mechanism, preferred to a shared
  map (`FailureMessage.of`, `CalendarFailureKind.of`, `DiagnosticReportService.warrants`, the `label` getters), and
  the web's `isFailure` early returns are expected
  ([ADR 0004](./docs/adr/0004-typed-failures-instead-of-thrown-exceptions.md),
  [ADR 0031](./docs/adr/0031-the-web-keeps-its-hand-written-failure-union-instead-of-effect.md)).
