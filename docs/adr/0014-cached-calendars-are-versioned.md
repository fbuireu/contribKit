# 14. Cached calendars are versioned by box name

Date: 2026-07-26

## Status

Accepted.

## Context

The app caches parsed calendars in Hive, and past-year entries never expire: only the current year carries a TTL, because a finished year does not change. That is correct for data whose *meaning* is stable.

It stops being correct the moment the meaning changes. When the app started reading GitHub's `data-level` instead of deriving levels from counts, every already-cached past-year calendar still held the old, wrong levels, and nothing would ever evict them. The fix would have been invisible to exactly the users who had used the app most.

## Decision

The cache is versioned by its box name. `_cacheBoxName` is `contribution_cache_v3`; every previous box is listed in `legacyContributionCacheBoxNames` and deleted from disk once at startup. It reached v3 when `contributionCount` became nullable. A stored `null` read back through a non-nullable cast is a crash, not a stale figure, which is exactly the class of change the version guards. Changing what a cached calendar means requires bumping the name in the same commit.

Adding a schema field and migrating in place was rejected for this class of change: the stored data was not wrong in shape, it was wrong in meaning, and there is nothing to migrate it *from*.

## Consequences

- **Every user takes a one-time cache miss** on the release that bumps it, and refetches. That is the cost, and it is bounded.
- The DTO still carries a nullable level and falls back to deriving one, which is now unreachable for entries written by this version. It is kept as defence for the next schema change rather than removed.
- Settings are a different problem with a different answer: they are versioned per key with a legacy fallback, because losing a user's chosen palette is not recoverable by refetching. See [`CLAUDE.md`](../../CLAUDE.md) for the rule.
