# 10. Only the JSON API is rate-limited

Date: 2026-07-26

## Status

Accepted.

## Context

Two public endpoints sit on the same Worker: `/api/contributions`, called directly by clients, and `/user/:username.svg`, the embed. The SVG endpoint is by far the more exposed of the two, so rate-limiting it is the obvious move.

It is also wrong. README embeds are not fetched by readers: GitHub proxies them through Camo, so nearly all SVG traffic arrives from a small set of shared proxy addresses. A limit keyed on the client IP would be consumed by Camo on behalf of every embed at once, and start failing calendars for everyone. The protection would cause the outage it exists to prevent.

The JSON API has no such problem: it is called from callers' own addresses, where a per-IP limit means what it says.

## Decision

The `API_RATE_LIMITER` binding is applied in [`middleware.ts`](../../web/src/middleware.ts) to `/api/*` only, at 100 requests per minute per `CF-Connecting-IP`. `/user/:username.svg` is deliberately not rate-limited; it relies on being cacheable, carrying a one-hour `max-age` and a day-long stale-while-revalidate window so the vast majority of embed views are answered by Camo's own cache rather than reaching us.

## Consequences

- **The SVG endpoint has no per-caller ceiling.** Its protection is downstream cache hit rate, so anything that defeats caching (a flood of distinct usernames, or cache-busting query strings) reaches the origin unthrottled and turns into a real GitHub fetch.
- **Only a rendered calendar is cacheable; every failure says `no-store`.** The one-hour window this decision leans on is a reason to be deliberate about what enters it. Failure responses set no `Cache-Control` at all for a year, which reads as "uncacheable" and is not: an intermediary may store a response that states no policy. A transient 502 held by Camo is a broken image in someone's README that no refresh clears, on the one route with no rate limit behind it.
- No Cloudflare-side cache is configured for Worker responses either, so a miss in Camo is a real origin hit. Enabling one would narrow that gap without reintroducing the shared-IP problem.
- This is why the mobile app cannot simply be pointed at `/api/*` as it stands: many users behind one carrier NAT would share a single bucket. See [11](0011-keep-the-apps-own-scraper-for-now.md), which holds that decision, and [8](0008-the-mobile-app-fetches-github-directly.md), which it supersedes.
- Anyone tempted to "fix" the missing limit on the SVG route should read this first. Adding it is a regression, not a hardening.
