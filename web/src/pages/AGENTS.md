# web/src/pages

Astro pages and API routes, plus [`web/src/middleware.ts`](../middleware.ts), which sits in front of all of them. This is the
composition root: the only layer that instantiates infrastructure, calls use cases and hands results to components.
It is also the only entry point for HTTP traffic. The site is server-rendered because the SVG endpoint cannot be
built ahead of time ([ADR 0007](../../../docs/adr/0007-server-rendered-web-app-on-the-edge.md)), so the `.astro`
pages need no `prerender` flag and every `.ts` route carries `export const prerender = false`.

- Query strings go through Zod in the API routes that take one, and `/api/contact` runs it over the request
  **body**; the `:username` route param and the `ck_user` cookie go through `parseUsername`. The two API routes
  check with `schema.validate(input)`, which answers yes or no and narrows the input it was given **untouched**, so
  no `.default`, `.catch`, `.transform` or coercion reaches the route: a schema that gains one goes through `parse` or
  `safeParse`, as the SVG route's `.catch` schema goes through `parse`.
- The query string and the cookie `index.astro` reads get no schema. `searchParams.get` and `Astro.cookies.get` are
  already typed `string | null` and `string | undefined`, and both values go straight into `resolveViewerIdentity`
  and `loadInitial`, whose `parseUsername` and `resolveYear` are the checks: a schema there would be a second
  spelling of a value object's rule. Zod comes from `astro/zod` here as in the browser ([ui guide](../ui/AGENTS.md)).
- A status, a message or a `Retry-After` is written by hand only for an answer no `Failure` produced: `/api/contact`
  answering a body that fails the Zod shape check with `"Invalid request body"`, the contact route's 202,
  `/api/health`'s 200 and 503, and the middleware's 429. `/api/contributions` answers a `user` that fails the shape
  check with an `InvalidInput` on `username`, so it maps like the rest: anything that reached a `Failure` maps
  through `@application/http/failure-http`, and its JSON body is `errorBodyFor`'s.
- In an `.astro` file there is no module scope, because the frontmatter runs on every request. That is why the
  repositories and the curried use cases live in [`_contributions.ts`](./_contributions.ts) and
  [`_contact.ts`](./_contact.ts) and are imported; the leading underscore keeps Astro from routing them.

## The routes

| File | Route | Notes |
| --- | --- | --- |
| [`index.astro`](./index.astro) | `/` | SSR landing page plus client interactivity |
| `user/[username].svg.ts` | `GET /user/:username.svg` | The embed endpoint |
| [`api/contributions.ts`](./api/contributions.ts) | `GET /api/contributions?user=&year=` | JSON |
| [`api/contact.ts`](./api/contact.ts) | `POST /api/contact` | The contact form's endpoint, and the app's ([ADR 0030](../../../docs/adr/0030-contact-messages-leave-through-cloudflares-send-email-binding.md)) |
| [`api/health.ts`](./api/health.ts) | `GET /api/health` | Configuration presence check |
| [`404.astro`](./404.astro), [`500.astro`](./500.astro) | `/404`, `/500` | Both render the shared `ErrorView`, **and both are reachable by hand** |
| [`contact.astro`](./contact.astro) | `/contact` | The contact form. **Indexable and in the sitemap**, unlike the legal pages |
| [`legal-notice.astro`](./legal-notice.astro), [`privacy.astro`](./privacy.astro), [`terms.astro`](./terms.astro) | `/legal-notice`, `/privacy`, `/terms` | The legal pages: `noindex` through their `robots` metadata, and out of the sitemap through `NOINDEX_SLUGS` in [`web/astro.config.ts`](../../astro.config.ts) |
| `_contributions.ts`, [`_contact.ts`](./_contact.ts) | - | Not routes: the shared compositions the data and contact consumers import |
| `_tests/` | - | Not routes: the route tests plus the failure boundary's, kept out of the namespace by the underscore |
| `AGENTS.md` | `/AGENTS`, 404'd | This file. Astro routes markdown too: see below |

**Everything here that is not underscore-prefixed is a public URL, `.md` included.** This file is a route: Astro
compiles it, and `AGENT_GUIDE_ROUTE` in `web/src/middleware.ts` answers 404 for it. A test file here would be an
endpoint with the vitest runtime bundled into the Worker, which is why the route tests live in `_tests/`. The docs
contract keeps both shut ([ADR 0018](../../../docs/adr/0018-src-pages-is-a-public-namespace-not-a-folder.md)).
Before adding a file here, decide what URL it becomes.

## Caching

`public, max-age=3600, stale-while-revalidate=86400` on both data responses, **and only when they carry data**.
Every failure answer a route here writes is `no-store`: a rejected username, a 404, a 429, a 502 and the 500 the
boundary writes. The SVG endpoint is where that bites: its answers reach a README through Camo, so a stored 502 is
a broken image a reader cannot refresh away, on the one route with no rate limit to fall back on
([ADR 0010](../../../docs/adr/0010-rate-limit-only-the-json-api.md)). `/api/health` sets `no-store` on both its
answers. The middleware's own 429 and its `/AGENTS` 404 are `no-store` too, and so are `404.astro` and
`500.astro`, which set it through `Astro.response.headers`, the way the landing page sets its own.

The landing page is `private` either way, because it reads the visitor's cookie. `cacheControlFor` decides it
after the fetch: the one-hour window only when the visitor asked for a username (or carries the cookie) **and** the
calendar loaded; `private, no-store` for the default view, a rejected username and a failed fetch.

**That header is pinned by an e2e**, in `web/e2e/user/[username].svg.spec.ts`, along with the `background=`
pattern's reject arm and the `no-store` a rejected username gets. Every `no-store` a route writes is covered at the
unit level too: in the route tests and the failure boundary, the middleware's in `middleware.test.ts`, and the
landing page's in `resolve-initial-view.test.ts`; the two error pages' are pinned end to end, in `web/e2e/404.spec.ts`
and `web/e2e/500.spec.ts`. **Nothing end to end covers a 429 on either route**, because reproducing one means GitHub
rate-limiting the Worker; the `Retry-After` passthrough is pinned at the unit level instead: both arms on both routes,
in [`_tests/contributions.test.ts`](./_tests/contributions.test.ts) and
[`_tests/username-svg.test.ts`](./_tests/username-svg.test.ts), over the mapping in
[`failure-http.test.ts`](../application/http/failure-http.test.ts).

## The two data endpoints diverge on purpose

|  | `/user/:username.svg` | `/api/contributions` |
| --- | --- | --- |
| Bad `palette` / `shape` / `background` | `.catch(default)`: renders anyway | not parameters here: ignored |
| Bad `year` | ignored: always the Rolling Window | `InvalidInput` → 400 |
| Missing `user` | in the path, so it cannot be missing | 400, an `InvalidInput` on `username` |
| Rate limited | **no** | yes, per IP |
| Body on failure | `text/plain` | JSON `{ error, kind }`, plus `field` naming a rejected parameter |

**The SVG route ignores `?year=` entirely**: it always asks `loadContributions` for `year: null`, the Rolling
Window, and builds its grid with `buildRollingGrid`. An embed URL is pasted into a README once and never revisited,
so a pinned year would quietly go stale forever.

**`/api/contributions` answers with `days` and repeats it as `cells`**, the field it shipped with, kept as a
deprecated alias pointing at the same array; `total` is Total Contributions under the name the endpoint shipped
with, `null` when an active day's Count is unknown.

## `POST /api/contact`

The one route that takes a body, and the only one the app calls. In order:

1. **Zod over the parsed body**, `{ name?, email, message, website? }`. A body that is not JSON, or that fails that
   shape, gets a hand-written 400 with `"Invalid request body"`, because nothing has produced a `Failure` to map.
2. **The honeypot.** A non-empty `website` answers **202** and delivers nothing. A bot is told it succeeded, which
   is the whole point of a honeypot: a 400 would tell it which field to stop filling. A *blank* one is an ordinary
   submission, because a browser posts every field it has.
3. **The use case**, whose `InvalidInput` becomes a 400 carrying `field` (`name`, `email` or `message`) so the form
   can point at the input that was wrong, and whose `Delivery` becomes a 502 carrying a fixed sentence.
4. **Every answer is `no-store`**, the 202 included.

The `Delivery` failure is logged through `logContactFailure` with the platform's own reason, which the response
never repeats. It carries the same `try`/`catch` boundary as the two data routes, and it is rate-limited on its own
bucket, `CONTACT_RATE_LIMITER` (five a minute), where everything else under `/api/` goes through `API_RATE_LIMITER`
(a hundred).

## `middleware.ts`

Runs on every request the Worker receives and does three things.

1. **A 404 for `/AGENTS`, before anything else.** Astro compiles this very file into a public page, and
   `AGENT_GUIDE_ROUTE` is what keeps it off the web.
2. **Rate limiting, `/api/*` only, across two buckets.** `/api/contact` is limited by `CONTACT_RATE_LIMITER` and
   every other `/api/` path by `API_RATE_LIMITER`; the answer is the same 429 with the same `Retry-After: 60`
   either way, the `period` both limits declare in `wrangler.toml`. Keyed on `CF-Connecting-IP`, falling back to the
   literal `"unknown"`, so requests arriving without that header share a single bucket. **The block is skipped when
   the selected binding is absent**, which is the case in local development, so "it did not rate-limit locally"
   proves nothing; the contact path does **not** fall back to the API limiter when its own is missing. The bindings
   are read with `import { env } from "cloudflare:workers"`, because `locals.runtime.env` is a getter that throws.
3. **Security headers on every SSR response**, including that 429. They are applied by copying the response
   (`new Response(response.body, response)`) and setting headers on the copy, because the `Response` returned by
   `next()` has immutable headers.

**Static assets never reach this middleware, and are covered separately.** `wrangler.toml` declares `[assets]`
without `run_worker_first`, so Workers Assets answers `/og.png`, `/robots.txt` and everything under `/_astro/`
*before* the Worker runs. `public/_headers` is the only mechanism that reaches them; `@astrojs/cloudflare` merges
its own immutable `Cache-Control` rule for `/_astro/*` into it at build time rather than overwriting it, so both
survive. It sets the three headers that mean something on a non-document response and deliberately not the rest: a
CSP does nothing for a PNG, and `Cross-Origin-Resource-Policy: same-origin` on [`og.png`](../../public/og.png) would
break the social-card preview the file exists for.

**Neither half is visible to [`middleware.test.ts`](../middleware.test.ts)**, which calls `onRequest` directly and therefore tests the
function rather than the request path. The e2e suite asserts both: `/` through the Worker, and three asset paths
around it.

The CSP allows `'unsafe-inline'` for scripts and styles and names Google Tag Manager, Google Analytics, Better Stack,
Cloudflare Web Analytics and Google Fonts explicitly. Adding a third-party origin means editing that list; there is
no catch-all source to fall back on. **A tag's script host is never its ingest host**, and the browser reports a
refused one in the console and nowhere else: Better Stack's `b.js` loads from `betterstack.net` and sends to the
source's own `s<id>.<region>.betterstackdata.com`, gtag loads from `googletagmanager.com` and posts to a regional
`region<n>.google-analytics.com`, and Cloudflare's beacon loads from `static.cloudflareinsights.com` and sends to
`cloudflareinsights.com`, so `connect-src` names `https://*.betterstackdata.com` and
`https://*.google-analytics.com`. `worker-src` is stated outright, because Better Stack builds its sampling worker
from a `blob:` URL and an unset `worker-src` falls back to `script-src`, which admits no blobs.
`middleware.test.ts` pins, for each vendor, the load host in `script-src` and the send host in `connect-src`.
Whether the Cloudflare beacon is injected at all is a dashboard setting, so the CSP admitting it is necessary and
not sufficient. One header is not uniform: `EMBED_ROUTE` overrides `Cross-Origin-Resource-Policy` to `cross-origin`
for `/user/<name>.svg` and nothing else, so the calendar embeds outside GitHub
([ADR 0017](../../../docs/adr/0017-the-svg-endpoint-opts-out-of-the-same-origin-resource-policy.md)).

## Gotchas

- **Every route that fetches contributions logs a failed fetch through `logContributionsFailure`, the landing page
  included**, with an `endpoint` tag (`ContributionsEndpoint.Api` / `.Svg` / `.Page`) that is the only thing
  distinguishing the three in Better Stack. A route logs through the `logger` it imports from
  `@infrastructure/logging/logger`, handed to the `failure-log` helpers.
- **An unexpected *throw* is covered by a boundary on every `.ts` route.** `/api/contributions`, the SVG route,
  `/api/contact` and `/api/health` each export a thin handler that wraps the real one in `try`/`catch`, logs through
  `logServerError` and answers `SERVER_ERROR_MESSAGE` with `no-store`, in that route's own body shape: JSON for the
  API routes, `text/plain` for the SVG. Without it Astro answers the throw by rendering `500.astro`: an HTML page, to
  a caller that reads JSON or an `<img>`. The docs test fails on a route without the three.
- **`500.astro` logs as a side effect of rendering, and `/500` is a public URL.** `logServerError` runs in the
  frontmatter, so anything that renders the 500 page twice reports twice. It reads the throwable from
  `Astro.props.error`, which Astro populates only when it invokes the page as an error handler, and the helper
  returns early when `error` is `undefined`, so a hand-typed `GET /500` writes no incident.
- **`/api/health` returns 503, not 200, when anything is missing.** It checks the analytics ID, the Better Stack
  tracking token, the `API_RATE_LIMITER`, `CONTACT_RATE_LIMITER` and `CONTACT_EMAIL` bindings and the
  `MAINTAINER_EMAIL` build-time variable, and reports `"ok"` only when every one of them is present. A
  local run is expected to fail it. `MAINTAINER_EMAIL` is read from `astro:env/server` in
  [`_contact.ts`](./_contact.ts), which is the composition root and therefore the one place that hands the
  mailbox to the infrastructure factory; the route tests mock that module the way they mock `cloudflare:workers`.
- **The landing page distinguishes an asked-for user from the default, and `resolveViewerIdentity` decides it.**
  `?user=` wins, then the `USERNAME_COOKIE`, then `FIRST_SUGGESTED_USERNAME`; `isExplicit` is true only for the first two,
  and it decides what a failure looks like: `daySourceFor` turns it into `Loaded`, `Empty` or `Placeholder`. An
  explicit user gets an empty grid for the Year it chose plus an error message; a first-time visitor gets a
  generated placeholder grid and no error at all. The frontmatter hands what it read to `resolve-initial-view.ts`
  and renders what it returns, because vitest does not load `.astro`.
- **A saved username is validated and discarded if it fails; a requested one is passed straight through.** That
  asymmetry is the rule, not an oversight. The cookie is storage this page wrote, so a value that no longer parses
  is stale state and is ignored. A `?user=` is **a person asking**, so it reaches `loadInitialContributions` raw,
  and its `parseUsername` returns `InvalidInput` → 400 → the empty grid and "invalid username", which is what
  `/api/contributions` and the client-side render path answer for the same input. Falling back to the cookie or
  `FIRST_SUGGESTED_USERNAME` instead would render someone else's real Contribution Calendar with no error. It is bounded to
  `MAX_USERNAME_LENGTH + 1` characters first, because that string is rendered into the page and a slice that short
  can never become valid.
- **The terminal block on the error pages is decoration.** `404.astro` and `500.astro` render the **same**
  `ErrorView`, driven entirely by props.
