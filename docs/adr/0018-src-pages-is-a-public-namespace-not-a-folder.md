# 18. `src/pages` is a public namespace, not a folder

Date: 2026-08-01

## Status

Accepted.

## Context

Two conventions this repo applies everywhere collided with one Astro rule, and nobody noticed for months.

The conventions: tests are colocated next to the code they cover, and every source layer carries a nested `CLAUDE.md` — the second is not a preference but an assertion in `docs/docs-consistency.test.ts`, so the file *must* exist at `web/src/pages/CLAUDE.md`.

The Astro rule: every file under `src/pages` that is not prefixed with `_` becomes a public route, and `.md` is in the default `pageExtensions` alongside `.astro` and `.html`.

The result was live on `contribkit.app`. The pages-layer agent guide was served as an HTML page at `/CONTEXT` — 200, no layout, and the only URL besides `/` in the published sitemap, because `@astrojs/sitemap` had no reason to exclude it. The three colocated route tests became endpoints: `/api/health.test` and `/api/contributions.test` each returned 500, which `500.astro` dutifully reported to Better Stack on every hit, and the vitest runtime rode into the deployed Worker as a 522 KB chunk. Renaming the nested guides from `CONTEXT.md` to `CLAUDE.md` had quietly re-pointed the leak at `/CLAUDE` for the next deploy.

None of the obvious escapes work. `astro:routes:resolved` hands integrations a mapped copy of the route list, so mutating it does nothing. `pageExtensions` is assembled in `settings.js` and integrations may only `push` onto it — `addPageExtension` has no inverse. Astro offers no `exclude` for the pages directory. The single mechanism the framework does provide is the underscore prefix, on a file or on any directory segment.

Prefixing the guide itself was rejected: `_CLAUDE.md` is not auto-loaded by an agent arriving in that folder, which is the entire reason the nested guides carry that name.

## Decision

`web/src/pages` is treated as a public URL namespace, not as a place to put files that happen to belong to the pages layer.

Route tests live in `web/src/pages/_tests/`, which Astro skips because the segment starts with `_`. They keep vitest's discovery and lose only same-directory imports.

The pages guide stays at `web/src/pages/CLAUDE.md`, and `AGENT_GUIDE_ROUTE` in `web/src/middleware.ts` answers `404` for `/CLAUDE` before the route runs. `astro.config.ts` also drops it from the sitemap. The page is still built — it is markdown, and small — but it is not reachable and not advertised.

Two assertions in `docs/docs-consistency.test.ts` hold the line: no `*.test.ts` under `web/src/pages` outside an underscore segment, and no markdown route there other than the guide, together with the constant that blocks it. `web/src/middleware.test.ts` asserts the 404 itself, and that a path merely starting with the same characters still resolves.

## Consequences

- **A new file under `web/src/pages` is a new public URL until proven otherwise.** That is now the first question to ask about one, and the reason the two guards exist.
- Route tests no longer sit beside their route. That is a real loss of colocation, paid to keep the namespace clean; `_tests/` is adjacent enough that the pair stays obvious.
- The guide is reachable in the repository and dead on the web, which is a small asymmetry someone will eventually try to "fix" by deleting the middleware branch. The guard fails if they do.
- Deleting `AGENT_GUIDE_ROUTE`, renaming the guide, or adding a second markdown file under `web/src/pages` all fail the contract rather than silently publishing.
- The leak was found by executing the build and reading the route manifest, not by reading the config. Anything that claims a file is "not a route" is worth checking the same way ([ADR 0015](./0015-the-maintenance-contract-is-enforced-by-a-test.md)).
