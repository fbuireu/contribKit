# Fetching Contributions

ContribKit gets contribution data by reading GitHub's **public** contributions page, with no GitHub API call, no token, and no OAuth. The web implementation lives in `infrastructure/github/github-html-contributions-repository.ts` and implements the domain `ContributionsRepository` interface.

---

## The endpoint it reads

```
https://github.com/users/{login}/contributions
```

The repository builds the URL, encoding the username and optionally scoping to a year:

- With a `year`, it sets `from={year}-01-01`.
- If the year is in the past, it also sets `to={year}-12-31` (the current year is left open-ended so it tracks "up to today").
- Without a year, GitHub returns the latest rolling year.

The username is always `encodeURIComponent`-escaped before being placed in the path.

| Request | Resulting URL |
|---------|---------------|
| latest year | `.../users/torvalds/contributions` |
| past year `2022` | `.../users/torvalds/contributions?from=2022-01-01&to=2022-12-31` |
| current year `2026` | `.../users/torvalds/contributions?from=2026-01-01` |

---

## The request

GitHub serves this fragment to browser-like clients, so the fetch sends matching headers:

| Header | Value |
|--------|-------|
| `User-Agent` | a desktop Chrome UA string |
| `Accept` | `text/html, */*` |
| `Accept-Language` | `en-US,en;q=0.9` |
| `X-Requested-With` | `XMLHttpRequest` |
| `Referer` | `https://github.com/{login}` |

Redirects are followed (`redirect: "follow"`).

---

## Turning responses into typed failures

The repository never throws. Network and HTTP outcomes are converted to a domain `Failure` at the boundary:

| Condition | Result |
|-----------|--------|
| `fetch` throws, including the 20-second `AbortSignal.timeout` | `network({ message })`, with no status |
| `404` | `notFound(username)` |
| `429` | `rateLimited({ message, retryAfterSeconds })`: the wait GitHub named, in either RFC form, or `null` |
| any other non-OK status | `network({ message: "GitHub returned <status>", status })` |
| OK but no Contribution Days parsed | `parse("Could not parse contributions")` |
| OK with Contribution Days | `ContributionCalendar` |

A successful result is `{ username, days, total }`, where `days` are the parsed `ContributionDay`s and `total` is the summed yearly count, or `null` the moment an active day's Count could not be read.

---

## Why scraping, not the API

- **No token required:** the GraphQL contributions API needs an authenticated PAT; the public page doesn't.
- **Only public data:** exactly what's already visible on a profile.
- **One place to update:** if GitHub changes the page structure, only this module (and its regexes) change. See **[HTML Parsing](HTML-Parsing)**.

The Flutter app has its own implementation (`infrastructure/github/contribution_repository_impl.dart`) following the same idea.

---

## See also

- **[HTML Parsing](HTML-Parsing)** covers how Contribution Days and counts are extracted.
- **[Calendar Grid](Calendar-Grid)** covers how parsed days become a grid.
- **[Troubleshooting](Troubleshooting)** covers what to do when fetching fails.
