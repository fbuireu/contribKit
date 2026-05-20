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
| `fetchContributions(repo)(username, year)` | Loads a `ContributionCalendar` for a user/year |
| `renderCalendarSvg(renderer)(calendar, options)` | Renders the SVG string for a calendar |
