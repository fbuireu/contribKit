# web/src/infrastructure

Implementations of `domain/` interfaces. The only layer allowed to reach the network, and the only one that knows
it is running inside a Cloudflare Worker. Never imports from `ui/`, `pages/` or `application/`.

## Invariants & rules

- **Factory functions returning an object that satisfies a domain interface.** No classes.
- **Convert at the boundary.** A network error, a non-OK status or unparseable HTML becomes a `Failure` here. No raw
  `Error` may escape this layer.
- **The scraper is the only place that knows GitHub's markup.** If GitHub changes the page, exactly one file here
  changes — and then so does the app's copy of the same parser
  ([ADR 0011](../../../docs/adr/0011-keep-the-apps-own-scraper-for-now.md)).

## `github/` — scraping the contributions page

`createGithubHtmlContributionsRepository()` returns the module-level `githubHtmlContributionsRepository` singleton.
It is a factory over a constant on purpose: the seam is what lets a route depend on a function rather than an
object, and what a future per-request variant would slot into.

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
   is that map's entry for its `id`, or `null`.

**Levels come from GitHub.** `data-level` is authoritative and is only run through `clampLevel`. This layer never
derives a level from a count — the app does, and only when the attribute is missing
([ADR 0008](../../../docs/adr/0008-the-mobile-app-fetches-github-directly.md)).

**Failure mapping:**

| Situation | Result |
| --- | --- |
| `fetch` throws | `network({ message })`, no status |
| status 404 | `notFound(username)` |
| any other non-OK status | `network({ message: "GitHub returned <status>", status })` |
| zero days parsed | `parse("Could not parse contributions")` |

**Zero days is a parse failure, never an empty calendar.** An empty calendar renders as a plausible-looking year of
no activity, which is a lie the reader cannot detect
([ADR 0005](../../../docs/adr/0005-scrape-githubs-public-contributions-html.md)).

**`total` is a sum of the Counts this parse recovered, and `null` when it recovered none.** It is not GitHub's own
headline figure — nothing here reads that — so it is only as complete as the tool-tip pass. `null` rather than `0`
because zero and unknown are different facts and the product may not invent the difference; a test pins that a page
whose days parse but whose tool-tips do not comes back with `total: null` and every Count `null`, not a year of
zeroes.

## `rendering/` — `svgStringRenderer`

Pure string concatenation into a `parts` array, joined once. There is no DOM in a Worker and this must not grow one.
It reads geometry from `@domain/services/svg-geometry` and per-shape markup from `@domain/services/cell-shapes`, so
the server renderer and the client-side preview draw identical cells.

- Defaults when the options omit them: `SVG_DEFAULT_CELL_SIZE`, `SVG_DEFAULT_CELL_GAP`, `showLabels: true`.
- **The background `<rect>` is emitted only when `background !== DEFAULT_BACKGROUND_COLOR`** (`"transparent"`). A
  transparent embed is the absence of a rect, not a rect with alpha, which is what lets a README show through.
- **Cells carry no attributes.** `renderCellShape` is called without the optional `attributes`, so the server's SVG
  has no `data-date` or `data-count` — only the client-side preview adds them, for the Cell Tooltip. An embed is an
  image, not a queryable document.
- The root element carries `role="img"` and a fixed `aria-label`.
- It draws whatever `chunkWeeks` returns, which is always 53 arrays. A calendar shorter than 371 days therefore
  renders with empty trailing weeks rather than a narrower image — the width comes from `WEEKS_PER_YEAR`, not from
  the data.

## `logging/`

`better-stack-logger` memoises a single `Logtail` client in a module-level variable that is **`undefined` before
first resolution and `null` when unconfigured** — the three-state check is deliberate, so a missing token is
resolved once rather than on every call. When either `PUBLIC_BETTER_STACK_SOURCE_TOKEN` or
`PUBLIC_BETTER_STACK_INGESTING_URL` is absent, **every log call silently no-ops.** Local development is always in
that state; do not read "no logs" as "no errors".

`getLogger(executionContext)` binds the client to the Worker's `ExecutionContext` when one is passed. Without it the
writes are still issued but are not tied to the request's lifetime, so a Worker can be torn down before they flush.
Callers pass **`Astro.locals.cfContext`**, which is where `@astrojs/cloudflare` puts it. The old `locals.runtime.*`
accessors are still defined, as getters that throw: `runtime.ctx` tells you to use `cfContext`, and `runtime.env`
tells you to `import { env } from "cloudflare:workers"` — which is exactly what `middleware.ts` does for the rate
limiter binding. Both API routes and the landing page pass the context; keep doing that.

`log-server-error.ts` is the narrow helper the 500 page uses. `describeError` handles `Error`, falsy, object and
everything else, and **the object branch is wrapped in a `try`** — `JSON.stringify` throws on a circular reference
and on a `BigInt`-valued property, and this runs in `500.astro`'s frontmatter, so an unserialisable throwable would
have turned the error page itself into a throw. It falls back to `String(error)`.

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
