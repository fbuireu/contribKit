# web/src/infrastructure

Implementations of the ports `domain/` and `application/` declare, and the IO behind them: the GitHub fetch, the
Email Routing send and the log line. Never imports from `ui/`, `pages/` or `application/`; a docs-contract
assertion checks every layer's import direction.

**The outbound GitHub request is cached at the edge, and that is the SVG endpoint's real throttle.**
[ADR 0010](../../../docs/adr/0010-rate-limit-only-the-json-api.md) deliberately leaves `/user/:username.svg`
out of the inbound rate limiter, and the pages guide says caching is the only thing between it and unthrottled
origin load. The response header alone cannot deliver that: the CDN key is the whole URL and the route ignores
unknown query parameters, so `?cb=1`, `?cb=2` and so on are unlimited distinct keys for one answer, each a fresh
fetch to github.com, and one caller could have GitHub rate-limit the Worker, which takes the embed down for every
README using it. The `fetch` carries `cf: { cacheTtl: ORIGIN_CACHE_SECONDS, cacheEverything: true }`, so N
cache-busted variants collapse to one origin hit per username and year per hour. A colocated test asserts the
directive, because it is load-bearing and invisible in the response.

## Ports and bindings

- `githubHtmlContributionRepository`, `svgStringRenderer` and `logger` are module-level values;
  `cloudflareContactMessageRepository` is a factory, because it takes the recipient. `errorMessageOf` in `errors/` is
  how a caught value becomes a `Failure`'s message: an `Error`'s own `message`, and `String(value)` for anything
  else.
- **A Cloudflare binding is named here, in [`middleware.ts`](../middleware.ts) and in
  [`pages/api/health.ts`](../pages/api/health.ts), and nowhere else.** `email/` sends through `CONTACT_EMAIL`, the
  middleware reads the two rate limiters, and the health route reports whether each binding is present. Nothing in
  `domain/` or `application/` knows a binding exists.
- **The scraper is the only place that knows GitHub's markup.** If GitHub changes the page, exactly one file here
  changes, and then so does the app's copy of the same parser
  ([ADR 0011](../../../docs/adr/0011-keep-the-apps-own-scraper-for-now.md)).

## `github/`: scraping the contributions page

`githubHtmlContributionRepository` is a module-level singleton, imported directly by
[`pages/_contributions.ts`](../pages/_contributions.ts). A second adapter would be a new export here rather than a
branch inside a factory.

**The request.** `buildUrl` hits `https://github.com/users/<username>/contributions`. When a `Year` is given it sets
`from=<year>-01-01`, and it sets `to=<year>-12-31` **only for a past year**: the current year is left open so the
response ends today rather than running on to 31 December through days that have not happened. The headers
matter: a desktop Chrome `User-Agent` (a compatibility shim for an unauthenticated read of a public page, not
concealment), `Accept-Language`, a `Referer` pointing at the user's profile, and **`X-Requested-With:
XMLHttpRequest`**, which is what makes GitHub return the calendar fragment. Dropping any of them is how this starts
silently returning a full HTML page that the regexes then fail to parse. The fetch carries
`AbortSignal.timeout(REQUEST_TIMEOUT_MS)` and follows redirects.

**The parse**, in two passes over the same HTML:

1. `TD_REGEX` finds every `<td>` whose attributes contain `ContributionCalendar-day`, then pulls `data-date`,
   `data-level` and `id` out of the attribute string. A day is kept only when it has **both** a date and a level.
2. `TOOLTIP_REGEX` finds every `<tool-tip for="…">` and its leading digits, building an `id → count` map once
   `COUNT_SEPARATORS` has stripped the grouping (`1,234`). A day's Count is that map's entry for its `id`, or `null`.
   **A parsed Count enters the map only if `countSchema.validate` accepts it**, a non-negative safe integer: the
   schema comes from `astro/zod` and refines with the domain's `isCount`, the range the browser's body schema holds a
   Count to as well. `\s*` gives a trailing no-break space back to the digit class, so the captured run can be
   separators alone (`<tool-tip …>&nbsp;No contributions` captures `"\u00a0"`), `parseInt` answers `NaN` for it, and
   that day's Count stays `null`, as the app's `int.tryParse` leaves it. The app's parser trims before matching where
   this one allows `\s*`, and a fix made in only one of the two is the drift
   [ADR 0011](../../../docs/adr/0011-keep-the-apps-own-scraper-for-now.md) exists to catch.
   **The rest of a scraped day gets no Zod schema.** The regexes fix its shape (`\d{4}-\d{2}-\d{2}` for a date, one
   digit for a level) and `contributionDay` decides its meaning: it rejects a date that is not on the calendar and
   clamps the level, the same constructor the client's JSON goes through
   ([ADR 0025](../../../docs/adr/0025-how-much-ddd-and-where-it-stops.md)). A `z.iso.date()` beside it would be a
   second calendar rule, and the domain cannot import Zod to share one.

**Levels come from GitHub.** `data-level` is authoritative, and `contributionDay` only clamps it. This layer never
derives a level from a count; the app does, and only when the attribute is missing. That divergence is recorded in
[ADR 0008](../../../docs/adr/0008-the-mobile-app-fetches-github-directly.md). `totalContributions` comes from
`totalContributionsFor`, the domain's one home for that rule, over exactly the days the page returned.

**Failure mapping:**

| Situation | Result |
| --- | --- |
| `fetch` or `response.text()` throws, including the 20 s timeout | `network(<the error's message>)` |
| status 404 | `notFound(username)` |
| status 429 | `rateLimited({ message, retryAfterSeconds })` |
| any other non-OK status | `upstream("GitHub returned <status>")` |
| zero days parsed | `parse("Could not parse contributions")` |

`retryAfterSeconds` is parsed from `Retry-After` in either form the RFC allows, all digits or an HTTP date, and the
date form must contain a letter. **Anything else is `null`, not zero**, where a looser parser answers zero:
`Number(" ")` is `0`, and `Date.parse("5.5")` reads a date in 2001, which clamps to `0`. The app's
`RateLimitedFailure` draws the same distinction.

## `rendering/`: `svgStringRenderer`

Pure string concatenation into a `parts` array, joined once, with its whole geometry from one `calendarLayout` call in
`@domain/services/svg-geometry` and its per-shape markup from `@domain/services/cell-shapes`, so the server renderer
and the client-side preview draw identical cells at identical positions. What is left here is the string templates.

- Defaults when the options omit them: `calendarLayout` applies `SVG_DEFAULT_CELL_SIZE`, `SVG_DEFAULT_CELL_GAP` and
  `showLabels: true` when the option is `undefined`.
- **The background `<rect>` is emitted only when `background !== DEFAULT_BACKGROUND_COLOR`** (`"transparent"`). A
  transparent embed is the absence of a rect, not a rect with alpha, which is what lets a README show through.
  `background` goes into `fill` verbatim, so the caller validates it: the SVG route through
  `EMBED_BACKGROUND_PATTERN`.
- **Cells carry no attributes.** `renderCellShape` is called without the optional `attributes`, so the server's SVG
  has no `data-date` or `data-count`: only the client-side preview adds them, for the Cell Tooltip.
- The root element carries `role="img"` and a fixed `aria-label`.
- It is as wide as the days make weeks. The SVG route always hands it `buildRollingGrid`'s 371 days, which is why
  every embed is 53 weeks wide.

## `email/`: the one thing the Worker sends rather than reads

`cloudflareContactMessageRepository` implements `ContactMessageRepository` and is the Worker's only outbound
**write**. It sends through Cloudflare's `send_email` binding, `CONTACT_EMAIL`, rather than a provider's API, so
there is no runtime secret to hold or rotate
([ADR 0030](../../../docs/adr/0030-contact-messages-leave-through-cloudflares-send-email-binding.md)).

**The sender is this file's, the recipient is the caller's.** `CONTACT_SENDER` is the `From`, fixed to
`contact@contribkit.app` because Cloudflare sends only from a zone Email Routing serves, and
`cloudflareContactMessageRepository` is a factory taking the recipient, which the composition root reads from the
`MAINTAINER_EMAIL` build-time variable, so this file is testable with a literal. The binding in
[`wrangler.toml`](../../wrangler.toml) names no `destination_address`, because the address is in no file. The
visitor's address goes in `Reply-To`, because putting it in `From` is what DMARC rejects.

**`ContactMessageEmail.tsx` is the email, and it is React Email, the way the sibling sites' are**: its components and
`render` both come from the one `react-email` package, the one biancafiore pins. It and its test are the only `.tsx`
files in the project, which is why the web `tsconfig` carries `jsx` and the Astro config carries the React
integration. The template takes the `ContactMessage`, the sent date and the site, and draws its header strip and its
button from `PALETTES.github`, the domain's own colours; the neutral greys are the email's own literals, because an
email client reads no CSS variable. `cloudflareContactMessageRepository` renders it twice through that `render`, once
as HTML and once with `plainText`, and hands both to `mime.ts`. Everything the visitor typed goes through React's
escaping, and a colocated test pins that a message cannot add markup. The two `mailto:` links percent-encode the
address on each side of its `@`, because the address rule admits `?`, `&`, `%` and `,`, and a link built from the raw
text lets an address add a `bcc` or a second recipient to the maintainer's reply.

**`mime.ts` builds the envelope by hand**: no `mimetext`, because a short header block and a
`multipart/alternative` body of two base64 parts do not justify a dependency, the same trade
[ADR 0006](../../../docs/adr/0006-parse-the-contributions-page-with-regexes.md) makes for the parser. Each part is
base64 over UTF-8 bytes folded at 76 columns, so a message may carry any line break; the boundary is a UUID stripped
to the characters RFC 2046 allows; every header value has its CR and LF replaced with a space.

**The binding is read through `import { env } from "cloudflare:workers"`,** the same route the middleware takes,
and `EmailMessage` comes from `cloudflare:email`. `env.CONTACT_EMAIL` is a **local stand-in in development**:
`wrangler dev` binds an unrestricted Send Email that writes the document to `web/.wrangler/tmp/email/` as an `.eml`
and reports success, which is the quickest way to read the exact bytes the Worker would hand to Email Routing,
rendered by workerd rather than by Node. **Only a `send` the platform rejects is a `Delivery`**: the `try` is around
`binding.send` alone, so an absent binding (configuration) and a template that fails to render (a defect) throw, and
the route's boundary logs them through `logServerError` and answers the 500 they are.

## `logging/`

`logger` is a module-level object with `info`, `warn`, `error` and `logError`, each taking one
`{ message, context }` object (`logError` adds `error`), and it sends nothing anywhere. Each call writes **one
`JSON.stringify` line to `console[level]`**, and Cloudflare's own observability exports it to Better Stack over
OTLP, named as a `destinations` entry in [`wrangler.toml`](../../wrangler.toml)
([ADR 0026](../../../docs/adr/0026-observability-is-cloudflares-exported-to-better-stack.md)).
[`logger.ts`](./logging/logger.ts) and [`contract.ts`](./logging/contract.ts) are the files biancafiore and
forever-pto carry in their own `src/infrastructure/logging/`: `contract.ts` differs only in `LOG_SERVICE`, and
`logger.ts` is byte for byte theirs. A change to one is a change to all three.

- **`service`, `level` and `message` are spread after the caller's context, not before**, so a caller cannot relabel
  its own line; `logger.test.ts` pins the order.
- **The line goes to `console[level]`, indexed by the contract's own union, inside a `try` that returns.** A level
  added to `LOG_LEVEL` that `console` has no method for fails to compile here, and every method runs inside that
  `try`, so a console that throws never fails the route that was logging. A context value that will not serialise
  (a circular reference, a `BigInt`) is written as `"[unserializable]"` and the rest of the line still goes out.
  `logger.test.ts` iterates the contract.
- **`logError` is how a throwable becomes a line.** It serialises `message`, `name`, `stack` and the error's own
  enumerable fields into an `error` field beside the caller's context. A non-`Error` value becomes
  `{ message, name: "UnknownError" }`, its `message` the value's JSON when it is an object that serialises,
  `String(value)` otherwise, and the object's tag when even that throws (an object with no prototype). An own field
  of an `Error` that will not serialise is written as `"[unserializable]"`, so the message, name and stack survive it.
- **A `url` field in a context never carries its query string.** `write` runs `stripQuery` from the contract over
  a string `url` on every line, whichever method emitted it, a rule shared with forever-pto so that a `url` field
  means the same thing in both sinks. Cloudflare's `redact_query_string = true` in `wrangler.toml` is a different
  guarantee: it redacts the **request** URL the platform records, not a field a caller passes.
- **Callers import `logger` directly, and it takes no `ExecutionContext`, because a `console` call has nothing to
  flush.** The `locals.runtime.*` accessors are defined as getters that throw: `runtime.ctx` tells you to use
  `cfContext`, and `runtime.env` tells you to `import { env } from "cloudflare:workers"`. The three endpoint routes
  that can fail, the landing page and the 500 page import `logger` and hand it to
  [`failure-log.ts`](../application/http/failure-log.ts), which declares the port it takes and makes every decision
  about whether and under which message to log; `/api/health` has nothing to report.
- **Local development exports nothing, and that is not silence.** `wrangler dev` prints the lines to the terminal and
  ships them nowhere, so "no logs in Better Stack" while developing means the destination is not involved, never that
  nothing went wrong.
- [`web/biome.json`](../../biome.json) turns `noConsole` off for [`logger.ts`](./logging/logger.ts) and for nothing
  else: that exemption is what keeps this file the only writer.

## Gotchas

- **A day whose `<td>` has no `id` can never have a Count**, because the tool-tip is joined on that id: it comes out
  as `count: null` with a real level. **A tool-tip pass that matches nothing is not a failure** either: the days
  still parse, so the calendar renders with correct levels and no Counts at all.
- **The `<td>` regex matches `ContributionCalendar-day` anywhere in the attribute string**, not a whole `class`
  value, and the `\s*` before a tool-tip's digits absorbs a pretty-printed newline and indent: GitHub adds classes,
  reorders attributes and reformats markup
  ([ADR 0006](../../../docs/adr/0006-parse-the-contributions-page-with-regexes.md)).
- `TD_REGEX`, `TOOLTIP_REGEX` and `COUNT_SEPARATORS` are module-level `/g` regexes reused across requests, driven
  through `matchAll` and `replace`, which start from zero; `DATE_REGEX`, `LEVEL_REGEX` and `ID_REGEX` are `.exec`ed,
  and are safe precisely because they are **not** `/g`.
- **The fetch follows redirects.** GitHub answers a renamed account by redirecting, so the calendar that comes back
  can belong to a Username other than the one asked for. The response is still labelled with the requested
  username, because that is what the repository echoes into `ContributionCalendar.username`.
