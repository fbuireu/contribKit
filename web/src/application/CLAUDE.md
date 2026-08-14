# web/src/application

Orchestration, in pure TypeScript. It composes `domain/` into whole operations and knows nothing about Astro,
Cloudflare or `fetch` — everything reaches it through a closure. Stateless: state belongs to `pages/` and `ui/`.

## Invariants & rules

- **Use cases are curried.** `useCase(dependencies)(params)`. The dependency arm runs once, at the module scope of
  `pages/_contributions.ts`; the per-request arm closes over an already-built repository. Do not collapse them into
  one call that takes both, and do not build the repository inside an `.astro` frontmatter — frontmatter is
  per-request code, so the landing page used to rebuild its infrastructure on every visit until that composition
  moved into a module.
- **Never throw.** Every use case returns `T | Failure`, or the `LoadContributionsResult` union described below.
- **Two arguments means one destructured object.** `fetchContributions` takes a single params object; that is the
  repo-wide convention, not a local one, and `domain/failures/failure.ts` obeys it too.

## The use cases

| Function | Returns | Notes |
| --- | --- | --- |
| `fetchContributions(repository)({ username, year })` | `ContributionCalendar \| Failure` | A pass-through onto `repository.fetch`. It exists so a route can depend on `@application/*` alone, not to add behaviour. |
| `loadInitialContributions(load)({ username?, year? })` | `LoadContributionsResult` | The one with real logic: it defaults, validates, loads and builds the 53×7 grid. |

`resolve-initial-view.ts` sits alongside them and is not a use case in the curried sense — it takes no
dependencies. It holds the landing page's request policy: `resolveViewerIdentity` (username precedence, whether the
visitor asked for anyone, and the resulting `Cache-Control`) and `daySourceFor` (which of the three day sources a
result and that flag imply). It returns decisions rather than markup, so it stays clear of `ui/` and stays testable
— which is the whole point, since the frontmatter that used to hold these rules is unreachable from vitest.

`fetchContributions` stays thin on purpose: it names the operation, and its return type is what
`loadInitialContributions` takes as its dependency, so it is the arm the composition in `_contributions.ts` is
built around.

**`renderCalendarSvg` used to sit beside it and no longer does.** It was `renderer => params => renderer(params)`
— the identity on a function — so `renderCalendarSvg(svgStringRenderer)` and `svgStringRenderer` were the same
value, and the SVG route now calls the renderer directly. The guide claimed both thin use cases were the place a
cross-cutting concern would go if one appeared. One appeared during a later pass — reporting a failed fetch — and
it went to `infrastructure/logging/log-contributions-failure.ts` instead, because that is where the logger lives.
There is also exactly one `SvgRenderer` and one `ContributionsRepository`, and no test substitutes either, so that
seam was hypothetical rather than real. Re-adding a use case is cheap if a second renderer ever appears; carrying
an identity function and a test asserting that JavaScript forwards arguments was not.

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

`fetchContributions` returns a domain `Failure`. `loadInitialContributions` returns
`{ ok: false, kind, status, message }` — already mapped through `statusFor` / `messageFor`, with the failure's own
`kind` carried alongside. The mapped pair exists because the caller is a page that renders HTML and needs a status
and a sentence, not a discriminated union it would have to re-map itself. **`kind` is there for one reason: so the
page can log what the two API routes log.** Drop it and a GitHub outage on `/` becomes invisible while the same
outage on `/api/contributions` is recorded — which is exactly what happened before it was added. Anything reaching
for a whole `Failure` after calling this is a sign the wrong use case was picked.

`http/log-contributions-failure.ts` turns a failed fetch into a log line, and owns the `SERVER_ERROR_STATUS`
threshold so no route repeats the comparison. It declares its own `FailureLogger` port — three lines, structurally
satisfied by the Better Stack logger — rather than importing one from `infrastructure/`, which is the direction the
layer map forbids. It lived in `infrastructure/logging/` for exactly one commit before that was noticed.

## `http/failure-http.ts`

The single mapping from a domain `Failure` to HTTP. Never inline either function, and never write a `switch` over
`failure.kind` anywhere else.

| Kind | Status | Message |
| --- | --- | --- |
| `NotFound` | 404 | the literal `"User not found"` |
| `InvalidInput` | 400 | `failure.message` |
| `Network` | 502 | `failure.message` |
| `Parse` | 502 | `failure.message` |

- **`STATUS_BY_KIND` is typed `Record<Failure["kind"], number>`,** so adding a kind to the union is a compile error
  here until it is mapped. That is the guard; do not replace it with a lookup that defaults.
- **`NotFound` never echoes the username back.** The failure carries it, `messageFor` discards it. Keep it that way —
  the string is rendered into an error page and returned as the body of an SVG response.
- **`Network` and `Parse` both map to 502**, deliberately. To a caller, "GitHub was unreachable" and "GitHub's HTML
  no longer parses" are the same class of problem — upstream is not usable right now — and both are logged with
  their `kind`, so the distinction survives where it matters.
- **`SERVER_ERROR_STATUS` lives here too**, and is the threshold above which a failure is worth logging. The routes
  no longer read it: `logContributionsFailure` in `infrastructure/logging/` applies it, so "what counts as our
  problem" is one decision applied in one place rather than a constant three callers had to remember to compare
  against.

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
