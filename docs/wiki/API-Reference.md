# API Reference

ContribKit's web component exposes a small public API on Cloudflare Workers. All data responses are cached `public, max-age=3600, stale-while-revalidate=86400`. Requests to `/api/*` are rate-limited per IP. Every response carries CSP and security headers set by the [middleware](https://github.com/fbuireu/ContribKit/blob/main/web/src/middleware.ts).

Base URL: `https://contribkit.app`

> **No authentication.** ContribKit reads only **public** GitHub data — there's no API key, token, or OAuth. Just call the endpoints.

---

## Endpoints

| Endpoint | Returns | Description |
|----------|---------|-------------|
| `GET /user/:username.svg` | `image/svg+xml` | Rendered calendar; accepts `palette`, `shape`, `background` |
| `GET /api/contributions?user=&year=` | `application/json` | Raw contribution cells plus yearly total |
| `GET /api/health` | `application/json` | Deployment health: env var/binding presence (never values) |

---

## `GET /user/:username.svg`

Renders the contribution calendar for `:username` as an SVG image. Always uses the latest rolling year.

### Query parameters

| Parameter | Default | Values |
|-----------|---------|--------|
| `palette` | `github` | `github`, `catppuccin`, `nord`, `dracula`, `gruvbox`, `sunset`, `tokyonight`, `onedark`, `rosepine`, `solarized`, `monokai` |
| `shape` | `rounded` | `rounded`, `square`, `circle`, `dot`, `hex` |
| `background` | `transparent` | `transparent`, any hex color (`#101010`), or a CSS color name |

Unknown values silently fall back to the default, so the image never breaks.

The username must be a valid GitHub login (alphanumeric with single hyphens, 1–39 chars). This endpoint always renders the **latest rolling year** — use `/api/contributions?year=` for historical data.

### Example

```
GET /user/torvalds.svg?palette=dracula&shape=circle&background=%23101010
```

```bash
curl -s "https://contribkit.app/user/torvalds.svg?palette=nord&shape=hex" -o torvalds.svg
```

### Errors

Errors return `text/plain` with the message:

| Status | Meaning |
|--------|---------|
| `400` | invalid username |
| `404` | GitHub has no such user (`User not found`) |
| `502` | GitHub unreachable, or the page couldn't be parsed |

---

## `GET /api/contributions`

Returns the raw contribution data as JSON.

### Query parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `user` | yes | GitHub username (alphanumeric + single hyphens, 1–39 chars) |
| `year` | no | Integer year in `2005 … current`. Omitted = latest rolling year |

```bash
curl -s "https://contribkit.app/api/contributions?user=torvalds&year=2023" | jq '.total'
```

### Response

```json
{
  "username": "torvalds",
  "cells": [
    { "date": "2024-01-01", "level": 0, "count": 0 },
    { "date": "2024-01-02", "level": 2, "count": 4 }
  ],
  "total": 1234
}
```

- `level` is `0`–`4` (GitHub's intensity bucket).
- `count` is the exact contribution count for that day, or `null` when GitHub doesn't expose a tooltip for the cell.
- `total` is the sum of all daily counts, or `null` when no counts are available.

### Errors

Errors return `{ "error": "<message>" }` with an appropriate status:

| Status | Meaning |
|--------|---------|
| `400` | Missing `user`, or invalid username/year |
| `404` | GitHub has no such user (`"User not found"`) |
| `429` | Rate limit exceeded |
| `502` | GitHub unreachable, or the page couldn't be parsed |

---

## `GET /api/health`

Reports whether the deployed worker was built/configured with each expected variable and binding. Reports **presence only — never values**. Sent with `Cache-Control: no-store`.

```json
{
  "status": "ok",
  "env": {
    "PUBLIC_GOOGLE_ANALYTICS_ID": true,
    "PUBLIC_BETTER_STACK_SOURCE_TOKEN": true,
    "PUBLIC_BETTER_STACK_INGESTING_URL": true,
    "API_RATE_LIMITER": true
  },
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

Returns `200` when everything is present, `503` (`"status": "misconfigured"`) otherwise.

---

---

## Rate limiting

`/api/*` requests pass through a Cloudflare rate limiter (the `API_RATE_LIMITER` binding), keyed on the caller's `CF-Connecting-IP`. Over the limit, the API responds:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
Content-Type: application/json

{ "error": "Too many requests" }
```

The `/user/:username.svg` route is not rate-limited at the middleware level and leans on caching instead.

---

## Caching

Data responses carry:

```
Cache-Control: public, max-age=3600, stale-while-revalidate=86400
```

So a calendar is served from cache for an hour, then revalidated in the background for up to a day. `/api/health` is the exception (`no-store`). README image embeds are additionally cached by GitHub's Camo proxy.

---

## Security headers

Every response (set by the middleware) includes:

| Header | Value |
|--------|-------|
| `Content-Security-Policy` | strict `default-src 'self'` policy (allows GA + Better Stack, fonts from Google) |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-origin` |

---

## See also

- **[How It Works](How-It-Works)** — what happens behind each request
- **[SVG Rendering](SVG-Rendering)** — how `palette`/`shape`/`background` are applied
- **[Web Application](Web-Application)** — middleware, env vars, deploys
