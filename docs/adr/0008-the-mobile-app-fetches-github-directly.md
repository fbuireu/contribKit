# 8. The mobile app fetches GitHub directly

Date: 2026-07-26

## Status

Accepted. The rationale below is reconstructed from the code — the original decision left no record in the history, so nothing here should be read as an account of what was intended at the time. It was re-examined on its merits and upheld in [11](0011-keep-the-apps-own-scraper-for-now.md).

## Context

The app could call ContribKit's own `/api/contributions`, which already does the scraping. It does not: it fetches and parses the GitHub page itself, with its own copy of the parser, its own on-device cache, and its own model of the calendar.

The effect is that the two clients are independent all the way down. The app keeps working when the web deployment is down, and it is not subject to the API's per-IP rate limit.

## Decision

The app owns its own `ContributionRepository` implementation against GitHub, and the duplication of the parser is accepted rather than accidental. Whoever changes one parser changes the other.

## Consequences

- **A change to GitHub's markup must be fixed twice**, and the app's fix reaches users through store review rather than a deploy. This is the standing cost.
- Duplication let the implementations drift in ways that changed results, not just structure. The app used to ignore GitHub's `data-level` and recompute each day's level from its count against the year's maximum, so the same user and year could be painted differently on web and mobile. Both now treat `data-level` as authoritative.
- They still differ when the attribute is missing: the app derives a level from the count, the web drops the day and lets the grid backfill it as level zero. In practice GitHub always emits it, so this only decides who degrades more gracefully.
- The two also model a calendar differently — the app as weeks carrying a year and a non-nullable count, the web as a flat list of days with a nullable count. The app therefore cannot represent an unknown Count at all, which is a known departure from the glossary.
- Why the app cannot simply be pointed at the API today is [10](0010-rate-limit-only-the-json-api.md); what adopting it would take is `docs/plans/0001-app-consumes-contribkit-api.md`.
