# 32. A calendar day is a UTC date in the app

Date: 2026-10-05

## Status

Accepted. Amends [23](0023-the-app-grid-covers-the-year-in-53-or-54-weeks.md) on one point: a difference between two days no longer crosses daylight saving, so that is no longer why `weeksFor` computes the leap Year from the calendar rule.

## Context

The app held a calendar day as a local `DateTime`. `DateTime.parse("2024-03-31")` is local midnight, so is `DateTime(year, month, day)`, and two services normalised a day with a private `_dateOnly` built the same way. Arithmetic on local values is exposed to daylight saving: a day is 23 or 25 hours long across a switch, and where a switch happens at midnight, a local midnight does not exist. The code stepped by calendar components and was correct. But nothing that ran in CI's zone, which is UTC, could notice a regression, because a test that names a daylight-saving day passes there whatever the code does.

The first answer observed the cause under a special zone: a CI step, `TZ=Europe/Madrid flutter test` over the two files that hold such a case, and a docs-test check that forced every test naming daylight saving into it. It worked, and it left this repository's CI different from the others' for the sake of one zone, with a list of file names to keep in step by hand.

The cause is the representation. A Contribution Day is a calendar date, not an instant: 31 March has no hour and no zone, and the person reading the calendar has none to give it. The web's day is an `IsoDate` string, which has no zone to get wrong. The app's is a `DateTime`, so the zone has to be chosen once, and UTC is the choice that cannot move.

## Decision

A calendar day is a UTC date, `DateTime.utc(year, month, day)`, everywhere in the app. A local `DateTime` is an instant: the clock's `today`, a cache stamp, the Year boundary the cache compares it with, a rate limit's `resetAt`. UTC has no daylight saving, so no arithmetic on days depends on the device's zone, and a test proves it in any zone, CI's included.

`CalendarDate` in `domain/value_objects/` is the one way in. `parse` and `tryParse` read a bare `YYYY-MM-DD`, and `of(instant)` is the date an instant falls on, read from the instant's own year, month and day. Today stays the person's local day: `today` arrives from `clockProvider` as a local instant, and `StreakService` reads it through `of`, so the app does not change which day is today.

The rejected alternative is the one this replaces: keep local days and observe them under a zone that has daylight saving. It shows the defect without removing its cause, and it asks CI to run something no other repository's CI runs. A dedicated type in place of a UTC `DateTime` was weighed and left: `ContributionDay.date` stays a `DateTime`, which is what `weekday` and the lattice's arithmetic read, and the convention is held by the docs test and by tests that assert `isUtc`.

## Consequences

- **A local and a UTC `DateTime` with the same fields are never `==`, under `TZ=UTC` as well**, because `isUtc` is part of the equality. A day built with a local constructor misses every `byDate` lookup and equals no other day, which is why one helper makes days and the docs test rejects `DateTime(` and `DateTime.parse` in `domain/` and `infrastructure/`. The three lines it lets through read instants: the cache stamp, the Year boundary and a reset time.
- **Nothing a person or a store reads changes.** The cache still holds each day as `YYYY-MM-DD`, written by `toIso8601String().substring(0, 10)`, which on a UTC date is the same ten characters, so the box keeps its name ([14](0014-cached-calendars-are-versioned.md)) and an entry written before this decision reads back as the same days. `CalendarDate.parse` takes only that shape, so an entry carrying another is a miss. The Cell Tooltip, the Export's `<title>` and the Home Screen Widget payload print or encode the same text, and no key of the payload carries a date.
- **A formatter must not convert a day.** `toLocal()` on a UTC midnight prints the day before in every zone west of UTC. The three formatters read the date's own fields, and `intl` formats a UTC `DateTime`'s own fields too.
- **CI's UTC cannot tell `of(instant)` from `instant.toUtc()`**: they agree at offset zero. The suite is run locally under `Europe/Madrid`, `America/Los_Angeles` and `Pacific/Kiritimati` whenever `CalendarDate` or a reader of `today` changes, and in CI the docs test is what holds the line.
- **`today` costs one conversion** wherever it meets a day, and `of` reads a UTC instant by its UTC fields, so an instant that is not the clock's has to be converted by its caller.
- Where it bites: the rule in [`CODING_STANDARDS.md`](../../CODING_STANDARDS.md) and the *Value objects* section of [`app/lib/domain/AGENTS.md`](../../app/lib/domain/AGENTS.md).
