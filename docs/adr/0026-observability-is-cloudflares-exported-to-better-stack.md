# 26. Observability is Cloudflare's, exported to Better Stack

Date: 2026-09-11

## Status

Accepted. Supersedes the delivery mechanism assumed by the *Deploy* section of [`CLAUDE.md`](../../CLAUDE.md), not the destination: the logs still land in the same Better Stack source.

## Context

Shipped logs and traces here, and only one of them worked.

`@logtail/edge` posted structured lines from the Worker to Better Stack's ingest over HTTP, memoised behind `getLogger`. A tail consumer, `contribkit-tail`, received Cloudflare's own `logs` and `exceptions` for every invocation and posted them to the same endpoint. And `[observability.traces]` was enabled in `wrangler.toml`, which Cloudflare rendered in its dashboard and exported nowhere, because at the time there was no destination setting to export it to.

That last sentence stopped being true. Cloudflare's automatic tracing reached open beta with OTLP export: a `destinations` array on `observability.logs` **and** `observability.traces`, naming destinations configured once in the dashboard with an OTLP endpoint and a bearer token. It instruments handler invocations, every outbound `fetch` and every binding call with no code, `console` output is attributed to the active span, and the exported log records carry the trace id. `redact_query_string` strips query strings from URLs in both signals.

The obvious move was to keep all three and add a library. The library built for this runtime, `@microlabs/otel-cf-workers`, wraps the Worker's `export default`, patches global `fetch` and exports OTLP itself. On Astro that means overriding `main` in `wrangler.toml` to a hand-written `worker.ts` that imports `@astrojs/cloudflare/entrypoints/server` and re-exports it wrapped. The adapter does permit it (`main: config.main ?? "@astrojs/cloudflare/entrypoints/server"`), and it would have worked. It also meant owning an entrypoint whose imports only resolve through Astro's Vite build, four new dependencies, a `protobufjs` build script to allow or deny, and a span exporter duplicating what the platform beneath it had started doing for free.

The alternatives were:

- **Keep the tail consumer and add native traces.** The smallest change, and incoherent: the tail consumer's lines carry no trace id, so the spans would arrive with nothing to join them to. Correlation is the reason to want traces beside logs at all.
- **Wrap the entrypoint with `@microlabs/otel-cf-workers`.** Full control of sampling and span shape, at the cost of a generated-entrypoint dependency, an override of `main` that Astro supports but does not document, and a second implementation of instrumentation the runtime already performs.
- **Let the platform emit both, and delete what duplicated it.**

## Decision

Both signals leave through Cloudflare. [`web/wrangler.toml`](../../web/wrangler.toml) names `destinations` on `observability.logs` and `observability.traces` in both stages, sets `redact_query_string = true`, and keeps `head_sampling_rate` at the 0.2 it already declared.

**Each stage exports to destinations of its own**, named `contribkit-<component>-<stage>-<signal>` so that the `<component>-<stage>` half is the one [ADR 0001](0001-monorepo-with-independently-released-components.md) already uses for GitHub Environments, and landing on a separate Better Stack source per stage. Destinations are an **account-level** namespace rather than a per-Worker one, so the names carry the project as a prefix: every Worker in the account draws from the same list, and forever-pto lives there too. Pointing development at the production pair would put the preview Worker of every pull request, driven by the E2E suite at the same sampling rate, into the source that production alerts from and into the same event budget. The docs contract asserts the two stages name different destinations, because copying the production block is the obvious way to undo this.

`main` is untouched: it stays the adapter's own entrypoint, so nothing here depends on the shape of what Astro's build emits.

`web/workers/tail/` is deleted, with `ci.yml`'s `deploy-tail` job, the `[[tail_consumers]]` blocks and `@logtail/edge`. What survives is the port: `logger` in [`web/src/infrastructure/logging/logger.ts`](../../web/src/infrastructure/logging/logger.ts) still satisfies the `FailureLogger` interface that [`application/http/failure-log.ts`](../../web/src/application/http/failure-log.ts) declares, so no caller in `application/` or `pages/` knows the transport changed. It writes one JSON line per call through `console`, tagged with `LOG_SERVICE` and the level, and the platform ships it.

The rejected alternatives are the half-move, which produces spans nothing can be joined to, and the library wrapper, which is the platform's own instrumentation written again above it.

## Consequences

- **The destinations live in the Cloudflare dashboard, not in this repository.** `destinations = ["contribkit-web-production-logs"]` is a name resolved at deploy time against configuration no file here contains. A destination renamed or deleted in the dashboard stops the export, and nothing in a build or a test will say so. This is the one thing this decision makes *worse* than the tail consumer, which at least had its endpoint in a workflow. The docs contract asserts that every `observability` block names a destination; it cannot assert that the destination exists.
- **`console` is how the Worker logs now, and the lint rule that banned it is lifted in exactly one file.** `noConsole` stays an error everywhere else; [`web/biome.json`](../../web/biome.json) turns it off for `logger.ts` alone, the same way it already exempts `cookie.ts` from `noDocumentCookie`. A `console.log` anywhere else is still a lint failure, which is what keeps the seam a seam.
- **Structured context is now serialized by us and parsed by the sink.** `@logtail/edge` took an object and sent it as fields. The logger writes `JSON.stringify` of one object, and whether Better Stack indexes those keys as fields depends on the sink, not on this code. The context keys cannot be overwritten by a caller: `service`, `level` and `message` are spread last, and `logger.test.ts` pins that.
- **`PUBLIC_BETTER_STACK_SOURCE_TOKEN` and `PUBLIC_BETTER_STACK_INGESTING_URL` no longer reach the Worker at all.** Nothing in `web/` reads them server-side. They remain declared because the browser tag still does, and that is a separate problem recorded separately.
- **Tracing is in open beta and is billed from 2026-10-01**, at $0.05 per million events above 10 million per month. The dial is `head_sampling_rate`, in both stages, and the preview Worker of every pull request carries the same 0.2. If the embed endpoint's traffic ever grows into that, lowering the development stage first is the cheap half.
- **Trace ids do not propagate beyond Cloudflare.** W3C trace context propagation is not available, so a span here cannot be joined to a trace in any service outside the platform. Since the only outbound call is an unauthenticated scrape of github.com, that costs nothing today.
- Where this bites: the *Deploy* section of [`CLAUDE.md`](../../CLAUDE.md), the `logging/` section of [`web/src/infrastructure/CLAUDE.md`](../../web/src/infrastructure/CLAUDE.md), the workflow table in [`ARCHITECTURE.md`](../../ARCHITECTURE.md), and the [CI-CD](../wiki/CI-CD.md) and [Web-Application](../wiki/Web-Application.md) wiki pages.
