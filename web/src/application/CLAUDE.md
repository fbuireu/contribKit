# web/src/application

Orchestration, in pure TypeScript. It composes `domain/` into whole operations and knows nothing about Astro,
Cloudflare or `fetch` — everything reaches it through a closure. Stateless: state belongs to `pages/` and `ui/`.

## Invariants & rules

- **Use cases are curried.** `useCase(dependencies)(params)`. The dependency arm runs once, at the module scope of
  `pages/_contributions.ts`; the per-request arm closes over an already-built repository. Do not collapse them into
  one call that takes both, and do not build the repository inside an `.astro` frontmatter — frontmatter is
  per-request code, so the landing page used to rebuild its infrastructure on every visit until that composition
  moved into a module. **The dependency is the repository's own method type**, not a use case wrapping it:
  `_contributions.ts` binds `githubHtmlContributionsRepository.fetch` and hands it straight to
  `loadInitialContributions`.
- **Never throw.** Every use case returns `T | Failure`, or the `LoadContributionsResult` union described below.
- **Two arguments means one destructured object.** `logContributionsFailure` and `loadInitialContributions` both
  take a single params object; that is the repo-wide convention, not a local one, and
  `domain/failures/failure.ts` obeys it too.

## The use cases

| Function | Returns | Notes |
| --- | --- | --- |
| `loadInitialContributions(load)({ username?, year? })` | `LoadContributionsResult` | The one use case there is: it defaults, validates, loads and builds the 53×7 grid. |

`resolve-initial-view.ts` sits alongside them and is not a use case in the curried sense — it takes no
dependencies. It holds the landing page's request policy: `resolveViewerIdentity` (username precedence, whether the
visitor asked for anyone, and the resulting `Cache-Control`) and `daySourceFor` (which of the three day sources a
result and that flag imply). It returns decisions rather than markup, so it stays clear of `ui/` and stays testable
— which is the whole point, since the frontmatter that used to hold these rules is unreachable from vitest.

**Two identity use cases used to sit beside it, and neither does now.** `renderCalendarSvg` was
`renderer => params => renderer(params)` and went first; `fetchContributions` was `repository => params =>
repository.fetch(params)` and went for the same reason, one pass later. Its stated justification — "it exists so a
route can depend on `@application/*` alone" — was an import path, not a behaviour, and its own test asserted only
that JavaScript forwards arguments. It was also laundering a type: `loadInitialContributions` named its dependency
`ReturnType<typeof fetchContributions>`, which is `ContributionsRepository["fetch"]` spelled the long way, and now
says so directly.

The guide claimed these thin use cases were the place a cross-cutting concern would go if one appeared. One
appeared — reporting a failed fetch — and it went to `http/failure-log.ts` instead, beside the port it takes.
There is exactly one `ContributionsRepository` and no test substitutes it, so that seam was hypothetical rather
than real. Re-adding a use case is cheap if a second repository ever appears.

## `loadInitialContributions`, in order

1. `username` defaults to `DEFAULT_USERNAME` (`torvalds`) when omitted, then goes through `parseUsername`. **An
   invalid username short-circuits before the repository is called** — asserted in the test, and the reason a junk
   handle costs no outbound request.
2. `year` goes through `parseYear`; anything that is not a `Year` — including a `Failure` — falls back to
   `currentYear()`. A bad `?year=` therefore renders the current year rather than erroring, which is the opposite
   of how `/api/contributions` treats the same input.
3. On success it returns the **built grid** under `days`, not the raw response: `buildGridFromApi` pads to 53×7, so
   the caller never sees a short year.

## The two error shapes, and why there are two

`ContributionsRepository.fetch` returns a domain `Failure`. `loadInitialContributions` returns
`{ ok: false, kind, status, message }` — already mapped through `statusFor` / `messageFor`, with the failure's own
`kind` carried alongside. The mapped pair exists because the caller is a page that renders HTML and needs a status
and a sentence, not a discriminated union it would have to re-map itself. **`kind` is there for one reason: so the
page can log what the two API routes log.** Drop it and a GitHub outage on `/` becomes invisible while the same
outage on `/api/contributions` is recorded — which is exactly what happened before it was added. Anything reaching
for a whole `Failure` after calling this is a sign the wrong use case was picked.

## `http/failure-log.ts` — one file, the whole logging obligation

It declares `FailureLogger` (one `error` method, structurally satisfied by the Better Stack logger, rather than
importing a port from `infrastructure/`, which is the direction the layer map forbids), both helpers that use it,
and `SERVER_ERROR_STATUS`, the threshold above which a failure is worth logging.

That was three files in two layers, and answering "what happens to a log line" meant walking six modules. The
threshold in particular lived in `failure-http.ts` — a *status* module — and was imported backwards by the logging
one; it now sits with the code that applies it.

- **`logContributionsFailure`** turns a failed fetch into a log line and applies the threshold itself, so no route
  repeats the comparison.
- **`logServerError`** is the narrow helper the 500 page uses, and it **returns early when `error` is
  `undefined`.** Astro populates `Astro.props.error` only when it invokes the page as an error handler, and
  `500.astro` is also the public URL `/500` — so every hand-typed visit used to write a fabricated incident with
  `reason: "unknown"`, unthrottled, and the e2e suite wrote six per run. "Was I invoked as an error handler?" is
  the helper's decision, the same way the threshold is.
  Its `describeError` handles `Error`, falsy, object and everything else, and **the object branch is wrapped in a
  `try`** — `JSON.stringify` throws on a circular reference and on a `BigInt`-valued property, and this runs in
  frontmatter, so an unserialisable throwable would have turned the error page itself into a throw. It falls back
  to `String(error)`.

## `http/failure-http.ts`

The single mapping from a domain `Failure` to HTTP. Never inline either function, and never write a `switch` over
`failure.kind` anywhere else.

| Kind | Status | Message |
| --- | --- | --- |
| `NotFound` | 404 | the literal `"User not found"` |
| `InvalidInput` | 400 | `failure.message` |
| `Network` | 502 | `failure.message` |
| `Parse` | 502 | `failure.message` |
| `RateLimited` | 429 | `failure.message` |

- **`STATUS_BY_KIND` is typed `Record<Failure["kind"], number>`,** so adding a kind to the union is a compile error
  here until it is mapped. That is the guard; do not replace it with a lookup that defaults.
- **`NotFound` never echoes the username back.** The failure carries it, `messageFor` discards it. Keep it that way —
  the string is rendered into an error page and returned as the body of an SVG response.
- **`Network` and `Parse` both map to 502**, deliberately. To a caller, "GitHub was unreachable" and "GitHub's HTML
  no longer parses" are the same class of problem — upstream is not usable right now — and both are logged with
  their `kind`, so the distinction survives where it matters.
- **`RateLimited` is a claim about a specific upstream answer.** GitHub's 429 used to arrive as `Network` and
  therefore as 502 — "could not reach github" for a service that answered perfectly well and said *slow down*. It
  carries `retryAfterSeconds`, which nothing renders yet; the kind is what matters, and the status is 429 rather
  than 502 so a caller can back off.
- **`SERVER_ERROR_STATUS` no longer lives here.** It is a logging threshold, and it moved to `http/failure-log.ts`
  beside the code that applies it. It sat in this file and was imported by the logging module, which is the seam
  being crossed backwards.

## Gotchas

- **A 502 here is a claim about GitHub, not about this Worker.** Every route logs anything at or above
  `SERVER_ERROR_STATUS`, so a GitHub outage shows up as a ContribKit incident unless you read the `kind` field in
  the log context.
- **`messageFor` forwards upstream text verbatim** for every kind except `NotFound`. A `Network` failure's message
  is whatever the scraper put there — `"GitHub returned 503"`, or the raw `error.message` of a failed `fetch` — and
  it is returned as the body of a `text/plain` SVG response and printed on the landing page. Anything a repository
  writes into a `Failure` is public copy.
- The params object is optional all the way down (`({ … } = {})`), so `loadInitialContributions(load)()` is legal
  and renders `torvalds` for the current year. That is what the landing page relies on for a first-time visitor.
- **`InitialContributions.days` is the grid; `/api/contributions`'s `days` is the scrape.** Same word, two shapes:
  this one is already padded to 53×7 by `buildGridFromApi`, so its first date is the Sunday on or before January
  1st and its length never varies. The endpoint returns the scraper's own days and leaves the padding to the
  client, which is why `page-init` calls `buildGridFromApi` itself before rendering.
