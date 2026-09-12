# web/src/infrastructure

Implementations of `domain/` interfaces. The only layer allowed to reach the network, and the only one that knows
it is running inside a Cloudflare Worker. Never imports from `ui/`, `pages/` or `application/`. A docs-contract
assertion checks every layer's import direction now, because this rule was stated for a year and enforced by
nothing.

**The outbound GitHub request is cached at the edge, and that is the SVG endpoint's real throttle.**
[ADR 0010](../../../docs/adr/0010-rate-limit-only-the-json-api.md) deliberately leaves `/user/:username.svg`
out of the inbound rate limiter, and the pages guide says caching is the only thing between it and unthrottled
origin load. The response header alone did not deliver that: the CDN key is the whole URL and the route ignores
unknown query parameters, so `?cb=1`, `?cb=2` and so on were unlimited distinct keys for one answer, each a fresh
fetch to github.com. One caller could have had GitHub rate-limit the Worker, which takes the embed down for every
README using it. The `fetch` carries `cf: { cacheTtl: ORIGIN_CACHE_SECONDS, cacheEverything: true }`, so N
cache-busted variants collapse to one origin hit per username and year per hour. A colocated test asserts the
directive, because it is load-bearing and invisible in the response.

## Invariants & rules

- **Factory functions returning an object that satisfies a domain interface.** No classes.
- **Convert at the boundary.** A network error, a non-OK status or unparseable HTML becomes a `Failure` here. No raw
  `Error` may escape this layer.
- **The scraper is the only place that knows GitHub's markup.** If GitHub changes the page, exactly one file here
  changes, and then so does the app's copy of the same parser
  ([ADR 0011](../../../docs/adr/0011-keep-the-apps-own-scraper-for-now.md)).

## `github/`: scraping the contributions page

`githubHtmlContributionsRepository` is a module-level singleton, imported directly by
[`pages/_contributions.ts`](../pages/_contributions.ts). A factory used to wrap it (a function returning a constant, with a test asserting that
its `fetch` was a function), and it was deleted: it constructed nothing, and a second adapter would be a new
export here rather than a new branch inside a factory.

**The request.** `buildUrl` hits `https://github.com/users/<login>/contributions`. When a `Year` is given it sets
`from=<year>-01-01`, and it sets `to=<year>-12-31` **only for a past year**: the current year is left open so the
response is a rolling window ending today rather than a year padded with days that have not happened. The headers
matter: a desktop Chrome `User-Agent`, `Accept-Language`, a `Referer` pointing at the user's profile, and
**`X-Requested-With: XMLHttpRequest`**, which is what makes GitHub return the calendar fragment. Dropping any of
them is how this starts silently returning a full HTML page that the regexes then fail to parse.

**The parse**, in two passes over the same HTML:

1. `TD_REGEX` finds every `<td>` whose attributes contain `ContributionCalendar-day`, then pulls `data-date`,
   `data-level` and `id` out of the attribute string. A day is kept only when it has **both** a date and a level.
2. `TOOLTIP_REGEX` finds every `<tool-tip for="…">` and its leading digits, building an `id → count` map. A day's Count
   is that map's entry for its `id`, or `null`. **The `\s*` before those digits is load-bearing**: the pattern
   anchored them immediately after the `>`, so the day GitHub pretty-printed its markup (a newline and an indent
   before the number), every Count on the page would have come back `null` at once. The app's parser trims before
   matching and never had this; it is exactly the "a fix in one is a bug left in the other" case
   [ADR 0011](../../../docs/adr/0011-keep-the-apps-own-scraper-for-now.md) exists to catch.

**Levels come from GitHub.** `data-level` is authoritative and is only run through `clampLevel`. This layer never
derives a level from a count; the app does, and only when the attribute is missing. That divergence is recorded in
[ADR 0008](../../../docs/adr/0008-the-mobile-app-fetches-github-directly.md); why there are two parsers at all is
[ADR 0011](../../../docs/adr/0011-keep-the-apps-own-scraper-for-now.md).

**Failure mapping:**

| Situation | Result |
| --- | --- |
| `fetch` throws, including the 20 s timeout | `network({ message })`, no status |
| status 404 | `notFound(username)` |
| status 429 | `rateLimited({ message, retryAfterSeconds })` |
| any other non-OK status | `network({ message: "GitHub returned <status>", status })` |
| zero days parsed | `parse("Could not parse contributions")` |

**A 429 is not an outage, and saying so was a lie the reader could act on.** Every non-404 status used to become
`network`, which `failure-http` maps to 502 and `contribution-errors` renders as "could not reach github", so
GitHub saying *slow down* was reported as GitHub being unreachable. `rateLimited` carries `retryAfterSeconds`,
parsed from `Retry-After` in either form the RFC allows (a count of digits, or an HTTP date), and maps to 429.
**Anything else is `null`, not zero.** The parser used `Number(header)`, which reads `" "` as `0` and lets `"5.5"`
fall through to `Date.parse`, whose legacy parser accepts it as a date in 2001 and yields `0` as well. "Retry
immediately" is the worst of the three possible wrong answers, so it now requires all-digits or a string with a
letter in it.
The app has had `RateLimitedFailure` since ADR 0004; this is the same distinction, in TypeScript.

**Reading the body is guarded separately from the fetch.** The timeout signal aborts the *response stream* too,
so a GitHub that answers with headers and then stalls makes `response.text()` reject (outside the `try` that
wraps the fetch, and therefore out of a layer whose rule is that only a `Failure` leaves it). Both are guarded.

**The outbound fetch carries `AbortSignal.timeout(20_000)`.** It had none, so a hung GitHub held the invocation open
until the platform killed it and the visitor got a generic edge error rather than a `Failure`. Twenty seconds is the
same budget the app pins, deliberately.

**Zero days is a parse failure, never an empty calendar.** An empty calendar renders as a plausible-looking year of
no activity, which is a lie the reader cannot detect
([ADR 0005](../../../docs/adr/0005-scrape-githubs-public-contributions-html.md)).

**`total` is `null` the moment a Contribution Day at level 1 or above has an unknown Count.** It is not GitHub's own
headline figure (nothing here reads that), so it is only as complete as the tool-tip pass, and a partial pass
cannot be reported as a measurement. A level-0 day with no Count does **not** void it, because GitHub's level 0 is
zero. That is the same rule `computeContributionStats` applies in the domain and the same one the app's `ContributionStatsService.totalFor`
applies, and this file did not follow it: it summed `count ?? 0` whenever *any* tool-tip parsed, so a page whose
`<td>`s parsed and whose tool-tips half failed produced an **understated total presented as exact**.
`statsWithScrapedTotal` then let that beat the domain function that had correctly refused to guess. It only degraded
honestly in the all-or-nothing case.

## `rendering/`: `svgStringRenderer`

Pure string concatenation into a `parts` array, joined once. There is no DOM in a Worker and this must not grow one.
It takes its whole geometry from one `calendarLayout` call in `@domain/services/svg-geometry` and its per-shape
markup from `@domain/services/cell-shapes`, so the server renderer and the client-side preview draw identical cells,
and now identical *positions*, because neither computes any. What is left here is the string templates.

- Defaults when the options omit them: `calendarLayout` applies `SVG_DEFAULT_CELL_SIZE`, `SVG_DEFAULT_CELL_GAP` and
  `showLabels: true` when the option is `undefined`, so this file no longer spells them out.
- **The background `<rect>` is emitted only when `background !== DEFAULT_BACKGROUND_COLOR`** (`"transparent"`). A
  transparent embed is the absence of a rect, not a rect with alpha, which is what lets a README show through.
- **Cells carry no attributes.** `renderCellShape` is called without the optional `attributes`, so the server's SVG
  has no `data-date` or `data-count`: only the client-side preview adds them, for the Cell Tooltip. An embed is an
  image, not a queryable document.
- The root element carries `role="img"` and a fixed `aria-label`.
- It draws whatever the layout's `cells` hold, and `chunkWeeks` inside it returns as many weeks as the days make. A calendar
  shorter than 371 days therefore renders with empty trailing weeks rather than a narrower image: the width comes
  from `WEEKS_PER_YEAR`, not from the data.

## `logging/`

`logger` is a module-level object with `info`, `warn`, `error` and `logError`, each taking one
`{ message, context }` object (`logError` adds `error`), and it sends nothing anywhere. Each call writes **one
`JSON.stringify` line to `console[level]`**, and Cloudflare's own observability exports it to Better Stack over
OTLP, named as a `destinations` entry in [`wrangler.toml`](../../wrangler.toml)
([ADR 0026](../../../docs/adr/0026-observability-is-cloudflares-exported-to-better-stack.md)). A `@logtail/edge`
client used to post the lines from inside the Worker, memoised in a three-state variable so a missing token was
resolved once; there is no token here to miss any more, and no client to memoise. [`logger.ts`](./logging/logger.ts)
and [`contract.ts`](./logging/contract.ts) are byte for byte the files forever-pto carries at the same path,
apart from `LOG_SERVICE`, so a reader who knows one logger knows the other and the two sinks answer the same
queries. A change to one is a change to both.

**`service`, `level` and `message` are spread after the caller's context, not before.** A caller handing
`{ context: { level: "info" } }` to `logger.error` cannot relabel its own line, which is the whole reason the sink
can be queried on those three fields. `logger.test.ts` pins the order.

**The line goes to `console[level]`, indexed by the contract's own union, inside a `try` that returns.** Indexing
rather than branching is what makes a level added to `LOG_LEVEL` that `console` has no method for fail to
compile here instead of falling through to `console.error`; `logger.test.ts` iterates the contract and asserts
each level reaches the method of its own name and no other. The `try` is the other half of *a log call cannot
fail its caller*: `JSON.stringify` throws on a circular reference or a `BigInt`, and a route that was logging a
failure must not fail again on the log. A context that will not serialise loses the line, silently, which is the
same trade forever-pto's logger makes and records in its ADR 0018.

**`logError` is how a throwable becomes a line.** It serialises `message`, `name`, `stack` and the error's own
enumerable fields into an `error` field beside the caller's context, and a non-`Error` value becomes
`{ message: String(value), name: "UnknownError" }`. `logServerError` in `application/http/` hands its throwable
here rather than describing it itself, so a 500's line carries a stack, and so it reads the same as the one
forever-pto's payment handlers write.

**A `url` field in a context never carries its query string.** `write` runs `stripQuery` from the contract over
a string `url` on every line, whichever method emitted it. Nothing here puts a secret on a query string today;
the rule is shared with forever-pto, where Stripe does, so that a `url` field means the same thing in both
sinks and a caller who genuinely wants a query string has to name the field something else. Cloudflare's
`redact_query_string = true` in `wrangler.toml` is a different guarantee: it redacts the **request** URL the
platform records, not a field a caller passes.

**There is no `ExecutionContext` in this any more, and callers import `logger` directly.** `getLogger(ctx)` and
`loggerFor(locals)` existed because a network write had to be tied to the request's lifetime or be torn down before
it flushed; a `console` call has nothing to flush. The `Astro.locals.cfContext` cast that `loggerFor` performed is
therefore gone from this layer entirely. The `locals.runtime.*` accessors are still defined as getters that throw:
`runtime.ctx` tells you to use `cfContext`, and `runtime.env` tells you to
`import { env } from "cloudflare:workers"`, which is what [`middleware.ts`](../middleware.ts) does for the rate
limiter binding. Both data routes, the landing page and the 500 page import `logger`; `/api/health` is the one
route without one, because it has nothing to report.

**Local development exports nothing, and that is not silence.** `wrangler dev` prints the lines to the terminal and
ships them nowhere, so "no logs in Better Stack" while developing means the destination is not involved, never that
nothing went wrong.

**`console` is a lint error everywhere else in this repository.** [`web/biome.json`](../../biome.json) turns
`noConsole` off for [`logger.ts`](./logging/logger.ts) and for nothing else, the same way it exempts `cookie.ts` from
`noDocumentCookie`. That exemption is what keeps this file the only writer.

**This folder holds the writer, and the decisions stay one layer up.** Whether something that went wrong is worth a
line, under which message, and above which status, is
[`failure-log.ts`](../application/http/failure-log.ts) in [`application/http/`](../application/CLAUDE.md): it takes a logger as a parameter rather than
reaching for one, and it declares the port it takes. That port and the two helpers were three files in two layers
before, two of them declaring **character-for-character identical** one-method interfaces (`ServerErrorLogger` here
and `FailureLogger` there) so that two helpers doing the same job could each be tested with a fake. `Logger` here
satisfies the one remaining port structurally: this layer still declares no dependency on that one, which is the
whole reason the port is not declared here.

## Gotchas

- **The `<td>` regex matches `ContributionCalendar-day` anywhere in the attribute string,** not a whole `class`
  value. That tolerance is load-bearing: GitHub adds classes and reorders attributes, and a pattern demanding
  `class="ContributionCalendar-day"` exactly would break the day a second class appears: a difference the two
  clients once had ([ADR 0006](../../../docs/adr/0006-parse-the-contributions-page-with-regexes.md)).
- **A day whose `<td>` has no `id` can never have a Count**, because the tool-tip is joined on that id. It comes out
  as `count: null` with a real level, a legitimate state the whole stack has to keep handling.
- **A tool-tip pass that matches nothing is not a failure.** The days still parse, so the calendar renders with
  correct levels and no Counts at all. That is the intended degradation, but it puts the whole stack one careless
  `?? 0` away from printing "0 contributions" for a year nobody measured. See the Count handling in `ui/`.
- `TD_REGEX` and `TOOLTIP_REGEX` are module-level `/g` regexes reused across requests. They are only ever driven through
  `matchAll`, which does not carry `lastIndex` between calls; switching either to `.exec` in a loop would introduce
  a cross-request state bug that shows up only under load. `DATE_REGEX`, `LEVEL_REGEX` and `ID_REGEX` are `.exec`ed,
  and are safe precisely because they are **not** `/g`.
- **The fetch follows redirects.** GitHub answers a renamed account by redirecting, so the calendar that comes back
  can belong to a login other than the one asked for. The response is still labelled with the requested
  username, because that is what the repository echoes into `ContributionCalendar.username`.
- The `User-Agent` is a hardcoded Chrome string. It is a compatibility shim, not concealment: the request is
  unauthenticated against a public page, and the endpoint is documented as scraping
  ([ADR 0005](../../../docs/adr/0005-scrape-githubs-public-contributions-html.md)).
- The month and weekday labels are hardcoded `rgba(255,255,255,…)`. On a light background they are close to
  invisible. Same class of problem as `noneLight`
  ([ADR 0012](../../../docs/adr/0012-light-theme-palette-variant-is-app-only.md)), same cause: the server cannot
  know the host page's theme.
