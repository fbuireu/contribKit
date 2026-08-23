# 7. The web app is server-rendered on the edge

Date: 2026-07-26

## Status

Accepted.

## Context

Most of the site is static: a landing page, a customizer, some legal pages. A static build would serve it well.

The SVG endpoint is not most of the site. An embed has to re-render with current data, on every request, for an arbitrary username that was never known at build time. That single requirement removes the static option, and once a server is running at request time there is little reason to serve the rest differently.

## Decision

`output: "server"` with the Cloudflare adapter, deployed as a Worker. Responses are cached at the HTTP layer with a one-hour `max-age` and a day-long stale-while-revalidate window, so no cache infrastructure is owned by the application.

## Consequences

- **This is the deepest lock-in in the repository.** The adapter, `wrangler.toml`, rate limiting, custom domain routing and observability are all tied to one hosting platform. Moving means replacing all of them, not swapping a dependency.
- The domain layer stays pure precisely so this is survivable: nothing under [`web/src/domain`](../../web/src/domain) knows the platform exists. See [3](0003-layered-domain-architecture-in-both-clients.md).
- Caching is the only thing standing between the endpoint and unthrottled origin load, which is what makes the rate-limiting decision in [10](0010-rate-limit-only-the-json-api.md) the shape it is.
