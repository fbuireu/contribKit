# app/lib/infrastructure/github/dtos

The transfer objects for the Hive calendar cache. Their shape mirrors GitHub's `weeks` / `contributionDays`
structure, which is why they read the way an API response would even though nothing here talks to an API today.

They exist only to turn stored JSON back into entities. **Convert before leaving `infrastructure/github/`** — a DTO
must never be referenced from `application/` or `ui/`.

## Invariants & rules

- **These types are read-only.** All three are `@JsonSerializable(createToJson: false)`, so codegen produces
  `fromJson` and nothing else.
- **`dart run build_runner build` after any change**, or `contribution_calendar_dto.g.dart` and the class disagree.
  The generated file is committed.
- **`level`, `contributionCount` and `totalContributions` are all nullable.** An older cache entry written before
  levels were stored still deserialises, and the repository derives the level through `ContributionLevelService`.
  The two Count fields are nullable because an unknown Count is not a zero
  ([ADR 0019](../../../../../docs/adr/0019-an-unknown-count-is-null-in-both-clients.md)); a stored `null` read through
  a non-nullable cast is a crash, which is why that change came with a cache version bump.

## The shape

| DTO | Fields |
| --- | --- |
| `ContributionCalendarDto` | `totalContributions: int?`, `weeks: List<ContributionWeekDto>` |
| `ContributionWeekDto` | `contributionDays: List<ContributionDayDto>` |
| `ContributionDayDto` | `date: String` (`YYYY-MM-DD`), `contributionCount: int?`, `level: int?` |

`date` is a string here and a `DateTime` on the entity; `level` is an index here and a `ContributionLevel` on the
entity. Those two conversions are the boundary this folder exists to hold.

## Gotchas

- **Writing is not generated. `_toDto` in `contribution_repository_impl.dart` is a hand-written map literal**, so
  the read side and the write side can drift and *nothing will tell you*. Adding a field means editing the DTO, the
  map literal and the entity conversion in the same commit; there is no compiler error and no failing codegen if you
  forget one. This is the single most important fact about this folder.
- **`level` is stored as `ContributionLevel.index`.** The enum is persisted positionally here, unlike the settings
  box, which stores enum `name`s. **Reordering `ContributionLevel` therefore silently recolours every cached
  calendar.** If the order ever has to change, bump `_cacheBoxName`
  ([ADR 0014](../../../../../docs/adr/0014-cached-calendars-are-versioned.md)).
- **A DTO change is a cache-schema change, and the directions are not symmetric.** Renaming a **required** field,
  or adding one, makes existing entries unparseable — a loud failure that becomes a refetch. Renaming the **nullable**
  `level` is the dangerous case: the entry still deserialises, `level` simply arrives `null`, and `_toDomain` quietly
  re-derives every level from the counts through `ContributionLevelService`, so a whole cached year silently changes
  colour instead of failing. *Removing* a field does not break anything either: the generated `fromJson` reads
  only the keys it declares and `disallowUnrecognizedKeys` is not set, so an entry still carrying the dropped key
  deserialises fine and the value is simply ignored. A broken read is survivable either way — it is swallowed and
  becomes a refetch — but a past-year entry never expires on its own, so the box name is the only real migration
  tool.
- `date` is written with `toIso8601String().substring(0, 10)`, so it is date-only and timezone-free by construction.
  Anything that starts writing a full timestamp breaks the `DateTime.parse` round-trip's equality with the grid's
  date-only keys.
