# Troubleshooting

Common issues and how to resolve them. ContribKit maps every failure to a typed `Failure` and a clear HTTP status (see **[How It Works](How-It-Works)**), so the message usually points straight at the cause.

---

## The calendar is empty or won't render

**Check the username is valid and public.** ContribKit only reads public contribution data. If the profile is set to hide its activity, there's nothing to render.

- `404` → GitHub has no such user. Check spelling/case.
- `400` → invalid username or year. Years go back to **2005**.

---

## A README embed shows a broken image

```markdown
![contributions](https://contribkit.app/user/YOUR_USERNAME.svg)
```

- Confirm the username is correct and the profile is public.
- Bad **option** values (`palette`, `shape`, `background`) don't break the image; they silently fall back to defaults. So a broken image is about the user/profile, not the params.
- Embedding outside GitHub works too: the SVG route is served with `Cross-Origin-Resource-Policy: cross-origin`, so browsers render it from any origin. It previously inherited `same-origin` from the site-wide headers and was silently blocked anywhere but behind a proxy; a stale cached copy can still show that. See **[API Reference](API-Reference)**.
- GitHub caches README images via Camo. After your activity changes, it can take a while for the cached image to refresh.

---

## Counts show but `total` is `null` (or counts are `null`)

GitHub doesn't always emit a `<tool-tip>` for every cell. ContribKit reports the `level` (0–4) regardless, but the exact `count` is `null` when no tooltip exists for that day. And `total` is `null` as soon as **any one** active day is in that state, not only when every count is missing. That is deliberate: a sum over the days that did parse is a lower bound, and printing it would present a guess as a measurement. The calendar still renders correctly. See **[HTML Parsing](HTML-Parsing)**.

---

## A `5xx` / "Could not parse contributions"

This usually means GitHub is unreachable or changed the structure of its contributions page.

- `Network` failure → GitHub returned a non-OK status or the fetch failed; usually transient, retry.
- `Parse` failure → zero Contribution Days were extracted, which points at a GitHub markup change. The fix lives in one place: the regexes in [`infrastructure/github/github-html-contributions-repository.ts`](../../web/src/infrastructure/github/github-html-contributions-repository.ts). See **[HTML Parsing](HTML-Parsing)**.

5xx failures are logged to Better Stack with the username, failure kind, and endpoint.

---

## Rate limited (HTTP 429)

A 429 means one of two different things, and the **body** is what tells them apart: the headers look the same either way.

**`{"error":"Too many requests"}`** is ContribKit's own limit: `/api/*` is rate-limited per IP at **100 requests/minute**, refused by the middleware before the route runs, with a fixed `Retry-After: 60`. Back off and retry.

**`GitHub is rate-limiting this Worker`** is upstream, forwarded to you rather than disguised as an outage. It used to come back as a `502` saying GitHub was unreachable, about a service that had answered perfectly well and said *slow down*. When GitHub names a wait, that figure is passed straight through as `Retry-After`; when it names none, no header is sent, because a fabricated one is worse than none. Retrying sooner will not help either way; the whole Worker is throttled upstream, not just you.

`/user/:username.svg` is never rate-limited by ContribKit ([ADR 0010](../adr/0010-rate-limit-only-the-json-api.md)), so a 429 there is always GitHub's. For README embeds this is rarely an issue thanks to caching (`max-age=3600, stale-while-revalidate=86400`).

---

## Deploy/preview issues (web)

The environment is chosen at **build** time: `CLOUDFLARE_ENV=<env> astro build` flattens the `[env.NAME]` block into `dist/server/wrangler.json`, and you then deploy with a plain `wrangler deploy`. Passing `--env` to the deploy cannot silently pick the wrong one (wrangler compares it with the config's `targetEnvironment` and fails loudly on a mismatch), so if per-env routes, ratelimits or observability are missing, look at what `CLOUDFLARE_ENV` was during the build, not at the deploy flags. See **[Web Application](Web-Application)**.

---

## Mobile: palettes look stale (and shapes never change)

The app uses generated copies of the design tokens in `app/assets/`. If you edited `shared/*.json` but the app still shows old data, run `pnpm sync:assets` (or let the lefthook pre-commit hook do it when you stage the change). Never edit `app/assets/` by hand. Only the release workflow re-copies them in CI; `ci-app.yml` does not.

**Syncing will never change a Cell Shape**, however. `shapes.json` is mirrored and bundled but no Dart file reads it: the app's shapes are a hardcoded `CellShape` enum ([ADR 0002](../adr/0002-shared-design-tokens-mirrored-into-the-flutter-bundle.md)). Adding a shape there changes the web only. See **[Project Structure](Project-Structure)**.

---

## Still stuck?

Open an issue on [github.com/fbuireu/ContribKit](https://github.com/fbuireu/ContribKit/issues).
