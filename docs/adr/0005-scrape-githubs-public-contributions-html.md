# 5. Contribution data is scraped from the public page

Date: 2026-07-26

## Status

Accepted.

## Context

The obvious source is GitHub's GraphQL contributions API. It requires an authenticated token on every request, which leaves three options: ask each visitor for a personal access token, run an OAuth flow, or funnel all traffic through one project-owned token and its rate limit.

None of them survives the product's promise. The whole pitch is that you type a username and get an image — for yourself, for someone else, embedded in a README that strangers load. A token requirement kills the embed outright, and a shared project token makes the product's availability a function of how popular it is.

The same contribution data is already public, rendered as HTML, at a stable URL that needs no authentication at all.

## Decision

Both clients fetch `github.com/users/{username}/contributions` and parse the rendered page. No token, no OAuth, no PAT — anywhere in the stack.

The GraphQL API is the rejected alternative, and it is rejected on product grounds rather than technical ones. It is the better interface; it is not one this product can require.

## Consequences

- **The parser is coupled to GitHub's markup and will break when it changes.** It is deliberately confined to one place per client so there is exactly one thing to fix — `githubHtmlContributionsRepository` on the web, `GitHubContributionRepository` in the app.
- The page exposes a day's level as an attribute but its exact count only inside a linked tooltip element, so a Count can legitimately be unknown while its level is known. That asymmetry is where the domain's "unknown is not zero" rule comes from.
- A parse yielding zero days reports a `Parse` failure rather than an empty calendar, which would render as a plausible-looking year of no activity. Distinguishing that from a missing user is why the app needed `ParseFailure` — see [4](0004-typed-failures-instead-of-thrown-exceptions.md).
- Only public data is ever read. There is no private-contribution story and cannot be one without reversing this.
