# application/

Pure TypeScript. Orchestrates `domain/` to fulfill a single use case.

## Rules

- Use cases are curried factory functions: take repository/service implementations, return the operation.
- No state. State lives in UI / page handlers.
- No knowledge of Astro, Cloudflare, or `fetch`. Receives everything via the closure.
- Always returns `T | Failure`. Never throws.

## Use cases

| Function | Purpose |
|---|---|
| `fetchContributions(repo)({ username, year })` | Loads a `ContributionCalendar` for a user/year |
| `renderCalendarSvg(renderer)({ calendar, options })` | Renders the SVG string for a calendar |
| `loadInitialContributions(load)({ username?, year? })` | Validates input, loads contributions, and returns the built 53×7 grid or `status` + `message` |

## Shared

| Module | Purpose |
|---|---|
| `http/failure-http.ts` | Maps a domain `Failure` to an HTTP status (`statusFor`) and user-facing message (`messageFor`) |
