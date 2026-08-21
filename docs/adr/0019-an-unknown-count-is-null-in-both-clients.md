# 19. An unknown Count is null in both clients

Date: 2026-08-14

## Status

Accepted. Closes the departure recorded as a consequence of [8](0008-the-mobile-app-fetches-github-directly.md), and amends [13](0013-the-app-grid-is-always-53-by-7.md), whose padding days were specified as "count zero". Both are amended rather than superseded — their decisions still stand.

## Context

[`CONTEXT.md`](../../CONTEXT.md) has always defined a Count as "the exact number of contributions on a Contribution Day. Unknown for some days, which is distinct from a known zero", and the root [`CLAUDE.md`](../../CLAUDE.md) has always said an unknown Count "must not be estimated, summed, or displayed as exact". The web obeyed both: `ContributionDay.count` is `number | null`.

The app could not. `count` was a non-nullable `int`, so three different situations collapsed into `0`: a tool-tip whose text carried no leading number, a day the scrape never mentioned at all, and a Contribution Grid padding day outside the requested Year. None of those is a day on which someone did nothing, and the app could not tell you which it was looking at.

The cost was not theoretical. Streaks broke on `count > 0`, so a day GitHub had coloured — level 1 or above — ended a run whenever its tool-tip failed to parse, and the same calendar produced a different Streak on the app than on the web, which has always keyed on the Contribution Level. `totalDaysActive` dropped the same days. Total Contributions was a sum over those zeroes, so a scrape that recovered the grid but not the tool-tips reported a confident, wrong figure where the web said `unknown`.

The obvious alternative — leave it, and treat the divergence as the accepted price of two implementations ([11](0011-keep-the-apps-own-scraper-for-now.md)) — is what [8](0008-the-mobile-app-fetches-github-directly.md) recorded. It stopped being defensible once the two clients started being compared concept by concept, because this was not a difference in structure; it was the app answering a question wrongly.

## Decision

`ContributionDay.count` and `ContributionCalendar.totalContributions` are `int?` in the app, matching `number | null` on the web. Two rules follow, and they are the reason the type changed rather than a side effect of it:

- **Activity is a Contribution Level question, not a Count question.** `ContributionDay.isActive` is `level != ContributionLevel.none`. `StreakService`, `totalDaysActive` and the month totals read it. A day whose Count could not be read still counts as active, because GitHub said it was.
- **Total Contributions is `null` the moment an active day has an unknown Count.** A sum that skipped those days is a lower bound, and printing a lower bound as a measurement is the thing the root guide forbids. `formatTotalContributions` renders it as `unknown` — the same word, for the same reason, as the web's function of that name.

Padding days carry `null` too. A day outside the requested Year is not a day with no contributions.

## Consequences

- **The Hive cache format changed, so the box is `contribution_cache_v3`** and `legacyContributionCacheBoxNames` lists both earlier boxes for deletion at startup ([14](0014-cached-calendars-are-versioned.md)). This is the version bump doing its job: reading a stored `null` through the previous non-nullable cast is a crash, not a stale figure.
- **Nothing may render `totalContributions` directly.** `intl`'s `NumberFormat.format` takes a `dynamic`, so an `int?` compiles and prints the literal string `null`, and the analyzer says nothing. Both surfaces go through `formatTotalContributions`; a new one must too.
- **The Cell Tooltip says `contributions unknown`** rather than a number nobody measured, and the SVG Export writes `unknown` in its per-cell `<title>` for the same reason.
- Reverting means another cache version, re-deciding what each of the three unknown cases becomes, and re-introducing a Streak that disagrees with the web's. That is the cost of the honesty, and it is why this is written down.
- Where it bites: [`app/lib/domain/CLAUDE.md`](../../app/lib/domain/CLAUDE.md) states the two rules, [`app/lib/infrastructure/CLAUDE.md`](../../app/lib/infrastructure/CLAUDE.md) states what the parser and the grid write, and [`app/lib/ui/CLAUDE.md`](../../app/lib/ui/CLAUDE.md) states the rendering rule.
