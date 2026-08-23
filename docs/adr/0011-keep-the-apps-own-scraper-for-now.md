# 11. The app keeps its own scraper for now

Date: 2026-07-26

## Status

Accepted, and it supersedes [8](0008-the-mobile-app-fetches-github-directly.md). This is the record for the app owning a second scraper: what it costs, why it stays, and what would change that. 8 remains as the account of how the two implementations diverged and of the fact that its own rationale was reconstructed rather than recorded.

Revisit when, and only when, the trigger below fires.

## Context

Serving the app from `/api/contributions` would collapse the duplicated parser into one, behind one deploy. That is worth doing: the parser is the most fragile code in the project, and today a change to GitHub's markup needs two fixes in two languages, one of which ships through store review.

The blocker is not effort. `/api/*` is rate-limited per client IP ([10](0010-rate-limit-only-the-json-api.md)), and mobile users behind carrier NAT share an address. Pointing the app at it would put unrelated users into one bucket and fail them together.

## Decision

Both scrapers stay, and the duplication is treated as accepted rather than accidental. **Whoever changes one changes the other**, in the same pull request: a fix landed in only one of them is a bug left in the other, and nothing in either build will say so.

Duplicated parsing is the smaller problem. It costs maintainer time; the alternative costs users their calendars.

## Consequences

- **A change to GitHub's markup must be fixed twice, and the app's fix reaches users through store review rather than a deploy.** That is the standing cost, and it is the whole reason the trigger below is worth watching for.
- **The trigger is specific:** this is revisited when the API can key its rate limit on something other than the caller's raw IP. Not before.
- At that point the migration is mechanical and already written down in [`docs/plans/0001-app-consumes-contribkit-api.md`](../plans/0001-app-consumes-contribkit-api.md), including the response-shape mismatch and the offline-cache requirement.
- Until then, proposals to point the app at the API should be closed with a link to this record rather than re-argued.
