# web/src/pages

Astro pages and API routes, plus [`web/src/middleware.ts`](../middleware.ts), which sits in front of all of them. This is the
composition root: the only layer that instantiates infrastructure, calls use cases and hands results to components.
It is also the only entry point for HTTP traffic.

## Invariants & rules

- **`export const prerender = false` on every endpoint route.** The three `.ts` routes carry it; the `.astro`
  pages do not, because `output: "server"` already makes SSR the default and there is nothing to opt out of. The
  site is server-rendered because the SVG endpoint cannot be built ahead of time
  ([ADR 0007](../../../docs/adr/0007-server-rendered-web-app-on-the-edge.md)).
- **Validate every external input before it reaches the domain.** Query strings go through Zod, in the two API
  routes and nowhere else; the `:username` route param and the `ck_user` cookie go through `parseUsername`, which
  is the domain's own validator and returns a `Failure` rather than throwing. Zod is for the *shape* of a query
  string, not a substitute for a value object.
- **Map `Failure` to HTTP only through `@application/http/failure-http`** (`statusFor`, `messageFor`,
  `retryAfterHeader`), guarded by `isFailure` from `@domain/failures/failure`. Never inline a status, a message or
  a `Retry-After` (**with one exemption, and it is the only one**): a request that fails the Zod shape check has
  produced no `Failure` to map, so
  `/api/contributions` answers a missing `user` with a hand-written 400. Anything that reached a value object maps
  through `failure-http`.
- **Compose at module scope, not per request**. In an `.astro` file there is no module scope, because the
  frontmatter runs on every request. That is why the repository and the curried use cases live in
  [`_contributions.ts`](./_contributions.ts) and are imported. The leading underscore keeps Astro from routing it. The landing page built
  its own repository inline until this file existed, quietly rebuilding infrastructure per visit.
- **No business logic here.** If a route grows a rule, it belongs in `application/` or `domain/`.
- **Every page uses `BaseLayout`.** Never hand-write `<!doctype html>` or a `<head>` in a page file.

## The routes

| File | Route | Notes |
| --- | --- | --- |
| [`index.astro`](./index.astro) | `/` | SSR landing page plus client interactivity |
| `user/[username].svg.ts` | `GET /user/:username.svg` | The embed endpoint |
| [`api/contributions.ts`](./api/contributions.ts) | `GET /api/contributions?user=&year=` | JSON |
| [`api/health.ts`](./api/health.ts) | `GET /api/health` | Configuration presence check |
| [`404.astro`](./404.astro), [`500.astro`](./500.astro) | `/404`, `/500` | Both render the shared `ErrorView`, **and both are reachable by hand** |
| [`legal-notice.astro`](./legal-notice.astro), [`privacy.astro`](./privacy.astro), [`terms.astro`](./terms.astro) | - | Static legal pages |
| `_contributions.ts` | - | Not a route: the shared composition all three data consumers import |
| `_tests/` | - | Not routes: the three route tests, kept out of the namespace by the underscore |
| `CLAUDE.md` | `/CLAUDE`, 404'd | This file. Astro routes markdown too: see below |

**Everything here that is not underscore-prefixed is a public URL, `.md` included.** This file is a route:
Astro compiled it and served it on `contribkit.app` until `AGENT_GUIDE_ROUTE` in `web/src/middleware.ts`
started answering 404 for it, and the colocated route tests were live endpoints returning 500 with the vitest
runtime bundled into the Worker. Two assertions in the docs contract keep both shut
([ADR 0018](../../../docs/adr/0018-src-pages-is-a-public-namespace-not-a-folder.md)). Before adding a file
here, decide what URL it becomes.

## Caching, and what is deliberately kept out of it

`public, max-age=3600, stale-while-revalidate=86400` on both data responses, **and only when they carry data**.
Every failure answer on every route here is `no-store`: a rejected username, a 404, a 429, and the 500 the boundary
writes. They carried no `Cache-Control` at all, which is not the same thing as uncacheable, because an intermediary
may store a response that says nothing heuristically. The SVG endpoint is where that bites: its answers reach a
README through Camo, so a stored 502 is a broken image a reader cannot refresh away, on the one route with no rate
limit to fall back on ([ADR 0010](../../../docs/adr/0010-rate-limit-only-the-json-api.md)). The two policies are
named once in [`application/http/cache-control.ts`](../application/http/cache-control.ts) rather than spelled at
each `Response`. `/api/health` sets `no-store` on both its answers, because a cached health check answers a
question nobody asked. The landing page is `private` either way, and keyed on the
same `isExplicit` the failure branch uses: the one-hour window when the visitor asked for a username **or carries
the cookie**, `no-store` when it is showing the default. It keyed on the query param alone until that was
reconciled, so a returning visitor's own calendar was never cached. Caching is also the
only thing standing between the SVG endpoint and unthrottled origin load, which is what makes the rate-limiting
decision the shape it is.

**That header is pinned by an e2e**, in `web/e2e/user/[username].svg.spec.ts`, along with the `background=`
pattern's reject arm and the `no-store` a rejected handle gets. Changing the cache policy is therefore a failing
test rather than a silent loosening of the only throttle that route has. The e2e asserts the **status** before the
header, which it did not: the assertion read a success-path header without establishing that the route had
succeeded, so a single throttled scrape during a parallel run reported as "the caching contract is broken". Every
`no-store` site is covered at the unit level too, in the three route tests and the failure boundary; each one was
verified by mutation. **Nothing end to end covers a 429 on either route**, because reproducing one means
GitHub rate-limiting the Worker; the `Retry-After` passthrough is pinned at the unit level instead: both
arms on both routes, in [`_tests/contributions.test.ts`](./_tests/contributions.test.ts) and [`_tests/username-svg.test.ts`](./_tests/username-svg.test.ts), over the mapping in
[`failure-http.test.ts`](../application/http/failure-http.test.ts).

## The two data endpoints diverge on purpose

They look symmetrical and are not:

|  | `/user/:username.svg` | `/api/contributions` |
| --- | --- | --- |
| Bad `palette` / `shape` / `background` | `.catch(default)`: renders anyway | not accepted |
| Bad `year` | not accepted; always the rolling latest | `InvalidInput` → 400 |
| Missing `user` | in the path, so it cannot be missing | 400 with a fixed message |
| Rate limited | **no** | yes, per IP |
| Body on failure | `text/plain` | JSON `{ error }` |

The SVG endpoint degrades instead of erroring because its response is consumed as an `<img>`: a 400 renders as a
broken image in someone's README, while a calendar in the wrong palette still shows the reader what they came for.
The JSON endpoint is consumed by code, which can read a status.

**The SVG route ignores `?year=` entirely**: it always calls the use case with `year: null`. That is not an
oversight to fix casually: an embed URL is pasted into a README once and never revisited, so a pinned year would
quietly go stale forever.

**It still has to build a Contribution Grid, and `buildRollingGrid` is the one that fits.** The route handed the
scraped days straight to the renderer until that was fixed, and the renderer's `chunkWeeks` slices whatever it is
given into sevens. GitHub emits its table weekday-major, so those days arrive as fifty-three Sundays, then
fifty-three Mondays: the Embed rendered the transpose of the calendar, every cell after the first carrying the
wrong date's Contribution Level. The landing page never showed it because `index.astro` and [`page-init.ts`](../ui/utils/page-init.ts) both go
through `buildGridFromApi`, which keys by date. Anything that reaches a renderer goes through a grid builder
first: the rolling one here, the Year-anchored one everywhere else.

**`/api/contributions` answers with `days` and repeats it as `cells`.** `days` is the name the glossary requires;
`cells` is the field the endpoint shipped with, kept as a deprecated alias so nothing that already reads it breaks.
Both point at the same array. New consumers read `days`; the alias goes away on a deliberate breaking release, not
in passing.

## `middleware.ts`

Runs on every request and does three things.

1. **A 404 for `/CLAUDE`, before anything else.** Astro compiles this very file into a public page, and
   `AGENT_GUIDE_ROUTE` is what keeps it off the web
   ([ADR 0018](../../../docs/adr/0018-src-pages-is-a-public-namespace-not-a-folder.md)).
2. **Rate limiting, `/api/*` only.** Keyed on `CF-Connecting-IP`, falling back to the literal `"unknown"`, so
   requests arriving without that header share a single bucket. **The whole block is skipped when the
   `API_RATE_LIMITER` binding is absent**, which is the case in local development, so "it did not rate-limit
   locally" proves nothing. A rejection is a 429 with `Retry-After: 60`. The binding is read with
   `import { env } from "cloudflare:workers"`, the only supported route since `locals.runtime.env` became a getter
   that throws.
3. **Security headers on every SSR response**, including that 429. They are applied by copying the response
   (`new Response(response.body, response)`) and setting headers on the copy, because the `Response` returned by
   `next()` has immutable headers.

**Static assets never reach this middleware, and are covered separately.** `wrangler.toml` declares `[assets]`
without `run_worker_first`, so Workers Assets answers `/og.png`, `/robots.txt` and everything under `/_astro/`
*before* the Worker runs. They carried no `nosniff`, no `Referrer-Policy` and no CSP at all until `public/_headers`
existed. That file is the only mechanism that reaches them; `@astrojs/cloudflare` merges its own immutable
`Cache-Control` rule for `/_astro/*` into it at build time rather than overwriting it, so both survive. It sets the
three headers that mean something on a non-document response and deliberately not the rest: a CSP does nothing for
a PNG, and `Cross-Origin-Resource-Policy: same-origin` on [`og.png`](../../public/og.png) would break the social-card preview the file
exists for.

**Neither half is visible to [`middleware.test.ts`](../middleware.test.ts)**, which calls `onRequest` directly and therefore tests the
function rather than the request path. The e2e suite asserts both: `/` through the Worker, and three asset paths
around it. This was found with `curl` against `wrangler dev`, not by reading the config.

The CSP allows `'unsafe-inline'` for scripts and styles and names Google Tag Manager, Better Stack and Google Fonts
explicitly. Adding a third-party origin means editing that list; there is no wildcard to fall back on. One header is
not uniform: `EMBED_ROUTE` overrides `Cross-Origin-Resource-Policy` to `cross-origin` for `/user/<name>.svg` and
nothing else, so the calendar embeds outside GitHub
([ADR 0017](../../../docs/adr/0017-the-svg-endpoint-opts-out-of-the-same-origin-resource-policy.md)).

## Gotchas

- **Every route that can see a 5xx logs it, including the landing page, through one call.**
  `logContributionsFailure` takes the `username`, `kind`, `reason`, `status` and an `endpoint` tag
  (`ContributionsEndpoint.Api` / `.Svg` / `.Page`), and **decides for itself whether the status is worth logging**,
  so no route carries the `SERVER_ERROR_STATUS` comparison any more. The tag is the only thing distinguishing the
  three in Better Stack. Each route used to spell the whole obligation out (the threshold, the `cfContext` cast and
  the five context fields), which is twelve near-identical lines written three times, and nothing made them agree.
  The page could only start logging at all once `loadInitialContributions` carried the failure's `kind`; before that
  a GitHub outage on `/` produced no log line.
- **That covers a mapped `Failure`. An unexpected *throw* is covered by a boundary on each endpoint route.** Both
  `.ts` routes export a thin `GET` that wraps the real handler in `try`/`catch`, logs through `logServerError` and
  answers `SERVER_ERROR_MESSAGE` in that route's own body shape: JSON for the API, `text/plain` for the SVG.
  Without it, anything the `isFailure` guards do not cover reached the platform as a bare 500 with no body and
  **no Better Stack line at all**, because `500.astro` only runs when Astro invokes a *page* as an error handler.
  That was a live hole, not a hypothetical: the domain guide records `renderCellShape` throwing inside an `<img>`
  for a shape with no renderer. The thrown message never reaches the body; a public endpoint is not a stack
  trace.
- **`loggerFor(Astro.locals)` is how a route gets a logger.** It is the only place that knows the execution context
  hides behind a cast on `locals`; four files performed that cast by hand before it existed.
- **`500.astro` logs as a side effect of rendering, and `/500` is a public URL.** `logServerError` runs in the
  frontmatter, so anything that renders the 500 page twice reports twice. It reads the throwable from
  `Astro.props.error`, which Astro populates only when it invokes the page as an error handler. A hand-typed
  `GET /500` used to write a fabricated incident with `reason: "unknown"`, on a route the middleware does not
  rate-limit (that is `/api/*` only), and the e2e suite wrote six of them per run. **The helper now returns early
  when `error` is `undefined`**, the same way it owns the server-error threshold; the page still calls it
  unconditionally.
- **The terminal block on the error pages is decoration, and must not read as data.** It once printed a fixed
  `trace: 8f3c1a`, an identifier that corresponded to nothing and that a user could reasonably have quoted in a bug
  report. Keep those lines free of anything that looks like a real identifier.
- **`/api/health` returns 503, not 200, when anything is missing.** It checks four keys (the analytics ID, both
  Better Stack variables and the `API_RATE_LIMITER` binding) and reports `"ok"` only when all four are present. A
  local run or a preview deployment is expected to fail it.
- **The landing page distinguishes an asked-for user from the default, and `resolveViewerIdentity` decides it.**
  `?user=` wins, then the `USERNAME_COOKIE`, then `DEFAULT_USERNAME`; `isExplicit` is true only for the first two,
  and it decides what a failure looks like: `daySourceFor` turns it into `Loaded`, `Empty` or `Placeholder`. An
  explicit user gets an empty grid plus an error message; a first-time visitor gets a generated placeholder grid
  and no error at all. Never surface a fetch failure for a user nobody asked for, and never show the placeholder to
  someone who asked: that would be inventing data for them.
  The frontmatter spelled all of this out, along with the cache decision, and **nothing could test it**: vitest does
  not load `.astro`. It now passes what it read to those two functions and renders what they return.
- **A saved username is validated and discarded if it fails; a requested one is passed straight through.** That
  asymmetry is the rule, not an oversight. The cookie is storage this page wrote, so a value that no longer parses
  is stale state and is ignored: it went through `parseUsername` and then the *raw* string was used anyway, so the
  parse was decoration. A `?user=` is **a person asking**, and `resolveViewerIdentity` used to validate it the same
  way: an unparseable handle fell through to the cookie, then to `DEFAULT_USERNAME`, with `isExplicit: false`.
  `/?user=not a handle` rendered **torvalds' real Contribution Calendar** with no error at all, and `page-init`
  then rewrote the URL to `?user=torvalds` and erased the evidence. `/api/contributions` answered the same input
  with 400, and so did the client-side render path; only SSR invented an answer. It now hands the raw value to
  `loadInitialContributions`, whose `parseUsername` returns `InvalidInput` → 400 → the empty grid and "invalid
  username" the other two surfaces already gave. It is bounded to `MAX_USERNAME_LENGTH + 1` characters first,
  because that string is rendered into the page and a slice that short can never become valid.
  **The cache header asks a different question from `isExplicit`.** `isExplicit` says a person asked;
  `Cache-Control` asks whether we could answer them, so a rejected handle gets `no-store` rather than caching an
  error page for an hour with a day of stale-while-revalidate behind it.
- **The scraped total wins over the computed sum**, and that rule lives in `statsWithScrapedTotal` in the domain,
  because it is a claim about what a Total Contributions is rather than a page concern. The check is `!= null`, not
  truthiness: a scraped total of `0` is a fact and has to beat a sum, and it used to lose. The page and
  `page-init.ts` had a copy each.
- **The SVG route parses its query string after the fetch, not before.** Nothing can fail there (every field is
  `.catch(default)`), so the order is harmless, but it is the reverse of `/api/contributions`, which validates
  first precisely because its inputs can be rejected.
- `404.astro` and `500.astro` render the **same** `ErrorView`, driven entirely by props. Never fork a second copy
  for a new status.
