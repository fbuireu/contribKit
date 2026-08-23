# 17. The SVG endpoint opts out of the same-origin resource policy

Date: 2026-08-01

## Status

Accepted.

## Context

[`web/src/middleware.ts`](../../web/src/middleware.ts) stamps one set of security headers onto every response, and one of them is `Cross-Origin-Resource-Policy: same-origin`. That header is the right default for a page: it tells the browser to refuse to hand this resource to any other origin as a subresource, which is exactly what you want for HTML, scripts and JSON.

`/user/:username.svg` is not a page. It is the product's headline feature: a calendar you embed. The header was never chosen for it; it arrived because the middleware applies the same map to everything, and the endpoint kept working, so nothing pointed at it.

It kept working for a reason that hid the problem. A GitHub README embed does not reach the Worker from a browser: Camo, GitHub's image proxy, fetches the SVG server-to-server and re-serves it from `camo.githubusercontent.com`. A resource policy is enforced by the browser against the origin that served the bytes, and Camo's copy carries its own headers. So the one embedding surface anybody had tested was the one surface where the header is inert.

Everywhere else it is not. A personal site, a GitLab profile, an MDX blog, a docs page: any plain `<img src="https://contribkit.app/user/x.svg">` on a non-`contribkit.app` origin is a cross-origin no-cors subresource load, and the browser drops it. The failure has no console-visible cause for the person embedding, produces no server-side error, and the troubleshooting page told them to go check whether their profile was public.

The alternative was to leave it and document the limitation: embedding is supported on GitHub, and elsewhere you proxy it yourself. That is defensible (the header does remove a class of resource-inclusion attack), but the class it removes is close to empty here. The response is a public rendering of already-public GitHub data, served with no credentials, no cookies read, and no per-caller variation. There is nothing to steal by including it.

## Decision

The middleware keeps `Cross-Origin-Resource-Policy: same-origin` as the default for every response, and overrides it to `cross-origin` for the SVG route alone. `EMBED_ROUTE`, declared in [`web/src/domain/value-objects/embed.ts`](../../web/src/domain/value-objects/embed.ts) beside the builder that produces those URLs, matches exactly `/user/<segment>.svg`, and `withSecurityHeaders` applies the override after the shared map, so the exemption cannot widen by accident: `/user/x.png`, `/user/x.svg/anything` and every `/api/*` path stay `same-origin`.

Dropping the header repository-wide was rejected. The pages and the JSON API have no embedding story and gain nothing from being includable.

This is what a public badge endpoint does: shields.io serves `cross-origin` for the same reason.

## Consequences

- **The narrowness of `EMBED_ROUTE` is load-bearing.** Loosening it to a `/user/` prefix would opt the whole namespace out of a policy the rest of the site relies on. [`web/src/middleware.test.ts`](../../web/src/middleware.test.ts) asserts both directions, and both assertions were verified by breaking the regex each way and watching the matching one fail.
- The SVG is now includable by anyone, from anywhere. That was already true in practice for anything willing to proxy it, and the endpoint is deliberately not rate-limited ([ADR 0010](./0010-rate-limit-only-the-json-api.md)), so the exposure it adds is bandwidth on a response cached for an hour.
- The header set is no longer uniform. Anyone reading `SECURITY_HEADERS` alone now has an incomplete picture of what a given response carries. The override is a few lines below it, and the [API reference](../wiki/API-Reference.md) documents both values.
- [`docs/wiki/Troubleshooting.md`](../wiki/Troubleshooting.md) no longer has to explain why an embed works on GitHub and nowhere else.
