# web/src/application

Orchestration, in pure TypeScript. It composes `domain/` into whole operations and knows nothing about Astro,
Cloudflare or `fetch`: everything reaches it as a closure or a parameter. Stateless: state belongs to `pages/` and
`ui/`.

A use case's dependency arm runs once, at the module scope of [`pages/_contributions.ts`](../pages/_contributions.ts)
or [`pages/_contact.ts`](../pages/_contact.ts), and the per-request arm closes over an already-built repository.
`_contributions.ts` wraps `githubHtmlContributionRepository.fetchCalendar` in a one-line arrow typed
`ContributionRepository["fetchCalendar"]` and hands that to `loadInitialContributions`, and `_contact.ts` does the
same with `deliver`: the arrow keeps the reference attached to its object, and adds nothing else.

## The use cases

| Function | Returns | Notes |
| --- | --- | --- |
| `loadInitialContributions(load)({ username, year?, thisYear })` | `LoadContributionsResult` | Validates, chooses the Year, loads and builds the grid covering it. `thisYear` is the UTC year the page read off the clock. |
| `sendContactMessage(deliver)({ name?, email, body })` | `ContactMessage \| Failure` | Parses, then delivers. **An `InvalidInput` short-circuits before `deliver` is called**, asserted in the test. It echoes the message back on success, the way `fetchCalendar` returns the calendar. |

[`resolve-initial-view.ts`](./use-cases/resolve-initial-view.ts) sits alongside them and is not a use case in the curried sense: it takes no
dependencies. It holds the landing page's request policy: `resolveViewerIdentity` (username precedence and whether
the visitor asked for anyone), then, once the fetch has answered, `daySourceFor` (which of the three day sources a
result and that flag imply) and `cacheControlFor` (the `Cache-Control` they imply). It returns decisions rather than
markup, so it stays clear of `ui/` and stays testable, which frontmatter is not: vitest does not load `.astro`.

## `loadInitialContributions`, in order

1. `year`, the raw `?year=`, goes through the domain's `resolveYear`, the rule the client's `renderFromGitHub` and
   `readYearFromUrl` apply: a whole number from `MIN_YEAR` to `thisYear` is that Year, and anything else becomes
   `thisYear`. A bad `?year=` therefore renders this year rather than erroring, which is the opposite of how
   `/api/contributions` treats the same input.
2. `username` goes through `parseUsername`. **An invalid username short-circuits before the repository is
   called**: asserted in the test, and the reason a junk value costs no outbound request. The landing page passes
   the username `resolveViewerIdentity` chose, which has already fallen back to `FIRST_SUGGESTED_USERNAME` (`torvalds`).
3. On success it returns the **built grid** under `days`, not the raw response: `buildGridFromApi` pads to whole
   weeks covering the Year, so the caller never sees a short year.

## The two error shapes, and why there are two

`ContributionRepository.fetchCalendar` returns a domain `Failure`. `loadInitialContributions` returns
`{ ok: false, kind, status, message }`, already mapped through `statusFor` / `messageFor`, with the failure's own
`kind` carried alongside, and the `year` it chose on both branches, so the page renders an error state for the
same Year a success would have covered. The mapped pair exists because the caller is a page that renders HTML and
needs a status and a sentence, not a discriminated union it would have to re-map itself. **`kind` is there for one
reason: so the page can log what the two data routes log.** Drop it and a GitHub outage on `/` becomes invisible
while the same outage on `/api/contributions` is recorded. A caller that needs the whole `Failure` calls
`loadContributions`, the repository method `_contributions.ts` binds, as the two data routes do.

## `http/failure-log.ts`: one file, the whole logging obligation

It declares `FailureLogger` (`error` and `logError`, structurally satisfied by the Worker logger, so this layer
imports no port from `infrastructure/`), the three helpers that use it, `SERVER_ERROR_STATUS` (the status at or above
which a failure is worth logging), `SERVER_ERROR_MESSAGE` (the body every endpoint's `catch` answers) and
`ContributionsEndpoint` (the `endpoint` tag).

- **`logContributionsFailure`** turns a failed fetch into a log line and applies the threshold itself.
- **`logContactFailure`** does the same for a refused Contact Message, under the message
  `"Contact message delivery failed"`, and takes the kind, the status and the platform's `reason`, never the
  visitor's name, address or message
  ([ADR 0030](../../../docs/adr/0030-contact-messages-leave-through-cloudflares-send-email-binding.md)).
- **`logServerError`** is what every endpoint route's `catch` and the 500 page call, and it **returns early when
  `error` is `undefined`.** Astro populates `Astro.props.error` only when it invokes the page as an error handler,
  and [`500.astro`](../pages/500.astro) is also the public URL `/500`, so without the early return every hand-typed
  visit writes a fabricated incident, unthrottled. It hands the throwable to `logger.logError`, which serialises
  `message`, `name`, `stack` and the error's own fields into the line.

## `http/failure-http.ts`

The single mapping from a domain `Failure` to HTTP: `statusFor`, `messageFor`, `fieldFor` (the `InvalidInput`
field name), `errorBodyFor` (the JSON error body: `error` from `messageFor`, `kind` naming the `Failure`, and the
`field` of an `InvalidInput`), `retryAfterHeader`, and `reasonFor` (the log's wording, which for a `Network` or a
`Delivery` is the platform's own).

| Kind | Status | Message |
| --- | --- | --- |
| `NotFound` | 404 | the literal `"User not found"` |
| `InvalidInput` | 400 | `failure.message` |
| `Network` | 502 | the literal `"Could not reach GitHub"` |
| `Upstream` | 502 | `failure.message` |
| `Parse` | 502 | `failure.message` |
| `RateLimited` | 429 | `failure.message` |
| `Delivery` | 502 | the literal `"Could not send your message"` |

- **`STATUS_BY_KIND` is typed `Record<Failure["kind"], number>`**, so adding a kind to the union is a compile error
  here until it is mapped ([ADR 0031](../../../docs/adr/0031-the-web-keeps-its-hand-written-failure-union-instead-of-effect.md)).
- **`Network`, `Upstream` and `Parse` all map to 502**: to a caller, "GitHub was unreachable", "GitHub refused" and
  "GitHub's HTML no longer parses" are the same class of problem, and all are logged with their `kind`, so the
  distinction survives where it matters, and `errorBodyFor` publishes it as `kind` for a client that words them apart.
- **`retryAfterHeader` turns a `RateLimited` failure's `retryAfterSeconds` back into a `Retry-After`**, which both
  data routes spread into their error response, and answers `{}` for every other kind and for a 429 that named no
  wait. `retryAfterFrom`, the scraper's parser in `infrastructure/github/`, clamps an HTTP-date already in the past
  to `0`, which goes out as `Retry-After: 0`; only `null` means we were not told.

## `http/cache-control.ts`

Four constants, `CACHEABLE_ANSWER` and `NOT_CACHEABLE` and their `private` pair, `PRIVATE_CACHEABLE_ANSWER` and
`PRIVATE_NOT_CACHEABLE`. Every endpoint route reads the first two rather than spelling a header value at the
`Response`; the landing page answers with the `private` pair, which `cacheControlFor` picks between, because it reads
the visitor's cookie and a shared cache must never serve one visitor's calendar to another. The
[pages guide](../pages/AGENTS.md) has the policy route by route, and why the SVG endpoint is where it bites.

It sits beside `failure-http.ts` and not inside it: a cache policy is a property of the *answer*, not a mapping
from a `Failure`, and several sites that need `NOT_CACHEABLE` (`/api/health`, a Zod shape rejection, a route's
`catch`) never produce a `Failure` at all.

## Gotchas

- **A 502 is a claim about upstream, not about this Worker**: GitHub, or Email Routing for a `Delivery`. Every
  route logs a mapped failure at or above `SERVER_ERROR_STATUS`, so a GitHub outage shows up as a ContribKit
  incident unless you read the `kind` field in the log context.
- **`messageFor` answers a fixed sentence for `NotFound`, `Network` and `Delivery`, and forwards `failure.message` for
  the rest.** A `Network` failure's message is the raw `error.message` of a rejected `fetch` or `response.text()`,
  the platform's wording, so it goes to the log through `reasonFor` and never into the SVG route's `text/plain`
  answer or the `error` field of `/api/contributions`; an `Upstream` failure's is `"GitHub returned 503"`, text we
  wrote. The landing page prints `contributionError`'s sentence for the `kind` instead.
- **`InitialContributions.days` is the grid; `/api/contributions`'s `days` is the scrape.** Same word, two shapes:
  this one is already padded to whole weeks by `buildGridFromApi`, so its first date is the Sunday on or before January
  1st and its length is `weeksFor(year)` × 7. The endpoint returns the scraper's own days and leaves the padding to the
  client, which is why `page-init` calls `buildGridFromApi` itself before rendering.
