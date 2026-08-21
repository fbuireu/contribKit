# web/src/infrastructure

Implementations of `domain/` interfaces. The only layer allowed to reach the network, and the only one that knows
it is running inside a Cloudflare Worker. Never imports from `ui/`, `pages/` or `application/` — a docs-contract assertion checks every layer's import
direction now, because this rule was stated for a year and enforced by nothing.

## Invariants & rules

- **Factory functions returning an object that satisfies a domain interface.** No classes.
- **Convert at the boundary.** A network error, a non-OK status or unparseable HTML becomes a `Failure` here. No raw
  `Error` may escape this layer.
- **The scraper is the only place that knows GitHub's markup.** If GitHub changes the page, exactly one file here
  changes — and then so does the app's copy of the same parser
  ([ADR 0011](../../../docs/adr/0011-keep-the-apps-own-scraper-for-now.md)).

## `github/` — scraping the contributions page

`githubHtmlContributionsRepository` is a module-level singleton, imported directly by
`pages/_contributions.ts`. A factory used to wrap it — a function returning a constant, with a test asserting that
its `fetch` was a function — and it was deleted: it constructed nothing, and a second adapter would be a new
export here rather than a new branch inside a factory.

**The request.** `buildUrl` hits `https://github.com/users/<login>/contributions`. When a `Year` is given it sets
`from=<year>-01-01`, and it sets `to=<year>-12-31` **only for a past year** — the current year is left open so the
response is a rolling window ending today rather than a year padded with days that have not happened. The headers
matter: a desktop Chrome `User-Agent`, `Accept-Language`, a `Referer` pointing at the user's profile, and
**`X-Requested-With: XMLHttpRequest`**, which is what makes GitHub return the calendar fragment. Dropping any of
them is how this starts silently returning a full HTML page that the regexes then fail to parse.

**The parse**, in two passes over the same HTML:

1. `TD_REGEX` finds every `<td>` whose attributes contain `ContributionCalendar-day`, then pulls `data-date`,
   `data-level` and `id` out of the attribute string. A day is kept only when it has **both** a date and a level.
2. `TOOLTIP_REGEX` finds every `<tool-tip for="…">` and its leading digits, building an `id → count` map. A day's Count
   is that map's entry for its `id`, or `null`. **The `\s*` before those digits is load-bearing**: the pattern
   anchored them immediately after the `>`, so the day GitHub pretty-printed its markup — a newline and an indent
   before the number — every Count on the page would have come back `null` at once. The app's parser trims before
   matching and never had this; it is exactly the "a fix in one is a bug left in the other" case
   [ADR 0011](../../../docs/adr/0011-keep-the-apps-own-scraper-for-now.md) exists to catch.

**Levels come from GitHub.** `data-level` is authoritative and is only run through `clampLevel`. This layer never
derives a level from a count — the app does, and only when the attribute is missing
([ADR 0008](../../../docs/adr/0008-the-mobile-app-fetches-github-directly.md)).

**Failure mapping:**

| Situation | Result |
| --- | --- |
| `fetch` throws, including the 20 s timeout | `network({ message })`, no status |
| status 404 | `notFound(username)` |
| status 429 | `rateLimited({ message, retryAfterSeconds })` |
| any other non-OK status | `network({ message: "GitHub returned <status>", status })` |
| zero days parsed | `parse("Could not parse contributions")` |

**A 429 is not an outage, and saying so was a lie the reader could act on.** Every non-404 status used to become
`network`, which `failure-http` maps to 502 and `contribution-errors` renders as "could not reach github" — so
GitHub saying *slow down* was reported as GitHub being unreachable. `rateLimited` carries `retryAfterSeconds`,
parsed from `Retry-After` in either form the RFC allows (a count of seconds, or an HTTP date), and maps to 429.
The app has had `RateLimitedFailure` since ADR 0004; this is the same distinction, in TypeScript.

**The outbound fetch carries `AbortSignal.timeout(20_000)`.** It had none, so a hung GitHub held the invocation open
until the platform killed it and the visitor got a generic edge error rather than a `Failure`. Twenty seconds is the
same budget the app pins, deliberately.

**Zero days is a parse failure, never an empty calendar.** An empty calendar renders as a plausible-looking year of
no activity, which is a lie the reader cannot detect
([ADR 0005](../../../docs/adr/0005-scrape-githubs-public-contributions-html.md)).

**`total` is `null` the moment a Contribution Day at level 1 or above has an unknown Count.** It is not GitHub's own
headline figure — nothing here reads that — so it is only as complete as the tool-tip pass, and a partial pass
cannot be reported as a measurement. A level-0 day with no Count does **not** void it, because GitHub's level 0is
zero. That is the same rule `computeContributionStats` applies in the domain and the same one the app's `_totalFor`
applies, and this file did not follow it: it summed `count ?? 0` whenever *any* tool-tip parsed, so a page whose
`<td>`s parsed and whose tool-tips half failed produced an **understated total presented as exact** — which
`statsWithScrapedTotal` then let beat the domain function that had correctly refused to guess. It only degraded
honestly in the all-or-nothing case.

## `rendering/` — `svgStringRenderer`

Pure string concatenation into a `parts` array, joined once. There is no DOM in a Worker and this must not grow one.
It takes its whole geometry from one `calendarLayout` call in `@domain/services/svg-geometry` and its per-shape
markup from `@domain/services/cell-shapes`, so the server renderer and the client-side preview draw identical cells
— and now identical *positions*, because neither computes any. What is left here is the string templates.

- Defaults when the options omit them: `calendarLayout` applies `SVG_DEFAULT_CELL_SIZE`, `SVG_DEFAULT_CELL_GAP` and
  `showLabels: true` when the option is `undefined`, so this file no longer spells them out.
- **The background `<rect>` is emitted only when `background !== DEFAULT_BACKGROUND_COLOR`** (`"transparent"`). A
  transparent embed is the absence of a rect, not a rect with alpha, which is what lets a README show through.
- **Cells carry no attributes.** `renderCellShape` is called without the optional `attributes`, so the server's SVG
  has no `data-date` or `data-count` — only the client-side preview adds them, for the Cell Tooltip. An embed is an
  image, not a queryable document.
- The root element carries `role="img"` and a fixed `aria-label`.
- It draws whatever the layout's `cells` hold, and `chunkWeeks` inside it always returns 53 arrays. A calendar
  shorter than 371 days therefore renders with empty trailing weeks rather than a narrower image — the width comes
  from `WEEKS_PER_YEAR`, not from the data.

## `logging/`

`better-stack-logger` memoises a single `Logtail` client in a module-level variable that is **`undefined` before
first resolution and `null` when unconfigured** — the three-state check is deliberate, so a missing token is
resolved once rather than on every call. When either `PUBLIC_BETTER_STACK_SOURCE_TOKEN` or
`PUBLIC_BETTER_STACK_INGESTING_URL` is absent, **every log call silently no-ops.** Local development is always in
that state; do not read "no logs" as "no errors".

`getLogger(executionContext)` binds the client to the Worker's `ExecutionContext` when one is passed. Without it the
writes are still issued but are not tied to the request's lifetime, so a Worker can be torn down before they flush.
Callers reach it through **`loggerFor(locals)`**, which performs the `Astro.locals.cfContext` cast — where
`@astrojs/cloudflare` puts the context — in the one place that should know about it. The old `locals.runtime.*`
accessors are still defined, as getters that throw: `runtime.ctx` tells you to use `cfContext`, and `runtime.env`
tells you to `import { env } from "cloudflare:workers"` — which is exactly what `middleware.ts` does for the rate
limiter binding. Both API routes, the landing page and the 500 page go through `loggerFor`; keep doing that rather than casting
`locals` again.

**This folder holds the client and nothing else.** Turning something that went wrong into a log line is
`failure-log.ts` in [`application/http/`](../application/CLAUDE.md) — it takes a logger as a parameter rather than
reaching for one, and it declares the port it takes. That port and the two helpers were three files in two layers
before, two of them declaring **character-for-character identical** one-method interfaces (`ServerErrorLogger` here
and `FailureLogger` there) so that two helpers doing the same job could each be tested with a fake. `Logger` here
satisfies the one remaining port structurally — this layer still declares no dependency on that one, which is the
whole reason the port is not declared here.

## Gotchas

- **The `<td>` regex matches `ContributionCalendar-day` anywhere in the attribute string,** not a whole `class`
  value. That tolerance is load-bearing: GitHub adds classes and reorders attributes, and a pattern demanding
  `class="ContributionCalendar-day"` exactly would break the day a second class appears — a difference the two
  clients once had ([ADR 0006](../../../docs/adr/0006-parse-the-contributions-page-with-regexes.md)).
- **A day whose `<td>` has no `id` can never have a Count**, because the tool-tip is joined on that id. It comes out
  as `count: null` with a real level — a legitimate state the whole stack has to keep handling.
- **A tool-tip pass that matches nothing is not a failure.** The days still parse, so the calendar renders with
  correct levels and no Counts at all. That is the intended degradation, but it puts the whole stack one careless
  `?? 0` away from printing "0 contributions" for a year nobody measured — see the Count handling in `ui/`.
- `TD_REGEX` and `TOOLTIP_REGEX` are module-level `/g` regexes reused across requests. They are only ever driven through
  `matchAll`, which does not carry `lastIndex` between calls; switching either to `.exec` in a loop would introduce
  a cross-request state bug that shows up only under load. `DATE_REGEX`, `LEVEL_REGEX` and `ID_REGEX` are `.exec`ed,
  and are safe precisely because they are **not** `/g`.
- **The fetch follows redirects.** GitHub answers a renamed account by redirecting, so the calendar that comes back
  can belong to a login other than the one asked for — and the response is still labelled with the requested
  username, because that is what the repository echoes into `ContributionCalendar.username`.
- The `User-Agent` is a hardcoded Chrome string. It is a compatibility shim, not concealment — the request is
  unauthenticated against a public page, and the endpoint is documented as scraping
  ([ADR 0005](../../../docs/adr/0005-scrape-githubs-public-contributions-html.md)).
- The month and weekday labels are hardcoded `rgba(255,255,255,…)`. On a light background they are close to
  invisible. Same class of problem as `noneLight`
  ([ADR 0012](../../../docs/adr/0012-light-theme-palette-variant-is-app-only.md)), same cause: the server cannot
  know the host page's theme.
