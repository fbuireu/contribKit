# infrastructure/

Implementations of `domain/` interfaces. Can depend on `fetch`, Cloudflare Workers APIs, parsing libraries. Never imports from `ui/`, `pages/`, or `application/`.

## Layout

| Directory | Contents |
|---|---|
| `github/` | `createGithubHtmlContributionsRepository` — HTML scraping of `github.com/users/{login}/contributions` |
| `rendering/` | `svgStringRenderer` — pure string-based SVG output, no DOM |
| `logging/` | `better-stack-logger` (Better Stack ingestion) and `logServerError` (500-page reporting helper) |

## Rules

- Factory functions that return objects implementing a domain interface. No classes.
- Convert network/parsing errors into `Failure` at the boundary. Never let raw `Error` escape.
- HTML scraping uses regex over the rendered page. If GitHub changes structure, only this module updates.
