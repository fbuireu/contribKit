# 8. The mobile app fetches GitHub directly

Date: 2026-07-26

## Status

Superseded by [11](0011-keep-the-apps-own-scraper-for-now.md), which is where the decision, its standing cost and its revisit trigger now live. This record is kept because the numbering is sequential and because two things here have no other home: the disclaimer below, and the divergence history in the consequences.

The rationale was reconstructed from the code. The original decision left no record in the history, so nothing here should be read as an account of what was intended at the time. It was re-examined on its merits and upheld in 11, and this file was thinned once the two records were found to be arguing the same case in nearly the same words.

## Context

The app could call ContribKit's own `/api/contributions`, which already does the scraping. It does not: it fetches and parses the GitHub page itself, with its own copy of the parser, its own on-device cache, and its own model of the calendar.

The effect is that the two clients are independent all the way down. The app keeps working when the web deployment is down, and it is not subject to the API's per-IP rate limit.

## Decision

The app owns its own `ContributionRepository` implementation against GitHub. **The rule that follows from it, that whoever changes one parser changes the other, and the cost of holding it, are [11](0011-keep-the-apps-own-scraper-for-now.md).** They were written out twice, and 11 is the copy with the revisit trigger attached.

## Consequences

- Duplication let the implementations drift in ways that changed results, not just structure. The app used to ignore GitHub's `data-level` and recompute each day's level from its count against the year's maximum, so the same user and year could be painted differently on web and mobile. Both now treat `data-level` as authoritative.
- They still differ when the attribute is missing: the app derives a level from the count, the web drops the day and lets the grid backfill it as level zero. In practice GitHub always emits it, so this only decides who degrades more gracefully.
- The two still model a calendar differently: the app as weeks carrying a Year, the web as a flat list of days. They no longer differ on the Count: it is nullable in both, which closes the departure from the glossary this consequence used to record ([19](0019-an-unknown-count-is-null-in-both-clients.md)).
- Why the app cannot simply be pointed at the API today, and what adopting it would take, are both in [11](0011-keep-the-apps-own-scraper-for-now.md).
