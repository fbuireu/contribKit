# app/lib/infrastructure/github/dtos

The transfer objects for the Hive calendar cache. Their shape mirrors GitHub's `weeks` / `contributionDays`
structure, which is why they read the way an API response would even though nothing here talks to an API today.
They carry a cached calendar to and from JSON, and nothing outside `infrastructure/github/` references one.

- **`dart run build_runner build` after any change**, or [`contribution_calendar_dto.g.dart`](./contribution_calendar_dto.g.dart) and the class disagree.
  The generated file is committed, and it holds both directions: the read *and* the write.
- **`level`, `contributionCount` and `totalContributions` are all nullable.** An older cache entry written before
  levels were stored still deserialises, and the repository derives the level through `ContributionLevelService`.
  The two Count fields are nullable because an unknown Count is not a zero
  ([ADR 0019](../../../../../docs/adr/0019-an-unknown-count-is-null-in-both-clients.md)). Making one non-nullable
  again turns every stored `null` into a read that throws, which `_readCache` treats as a miss, so every cached
  calendar holding an unknown Count is refetched.

## The shape

| DTO | Fields |
| --- | --- |
| `ContributionCalendarDto` | `totalContributions: int?`, `weeks: List<ContributionWeekDto>` |
| `ContributionWeekDto` | `contributionDays: List<ContributionDayDto>` |
| `ContributionDayDto` | `date: String` (`YYYY-MM-DD`), `contributionCount: int?`, `level: int?` |

`date` is a string here and a `DateTime` on the entity; `level` is an index here and a `ContributionLevel` on the
entity. Those two conversions are the boundary this folder exists to hold.

## Gotchas

- **Both directions are generated.** `_toDto` in
  [`contribution_repository_impl.dart`](../contribution_repository_impl.dart) builds the DTOs and `jsonEncode` calls
  the generated `toJson`, so a field on one side and not the other is a compile error or a missing key that codegen
  produces. A test in
  [`contribution_repository_impl_test.dart`](../../../../test/infrastructure/github/contribution_repository_impl_test.dart) also reads the stored JSON back and asserts its key set, because
  codegen cannot tell you that the *entity* conversion forgot the same field.
- **`level` is stored as `ContributionLevel.index`.** The enum is persisted positionally here, unlike the settings
  box, which stores enum `name`s. **Reordering `ContributionLevel` therefore silently recolours every cached
  calendar.** If the order ever has to change, bump `_cacheBoxName`
  ([ADR 0014](../../../../../docs/adr/0014-cached-calendars-are-versioned.md)).
- **A DTO change is a cache-schema change, and the directions are not symmetric.** Renaming a **required** field,
  or adding one, makes existing entries unparseable, and each one becomes a refetch. Renaming the **nullable**
  `level` is the dangerous case: the entry still deserialises, `level` simply arrives `null`, and `_toDomain` quietly
  re-derives every level from the counts through `ContributionLevelService`, so a whole cached year silently changes
  colour instead of failing. *Removing* a field does not break anything either: the generated `fromJson` reads
  only the keys it declares and `disallowUnrecognizedKeys` is not set, so an entry still carrying the dropped key
  deserialises fine and the value is simply ignored. A broken read is survivable either way (it is swallowed and
  becomes a refetch), but a past-year entry never expires on its own, so the box name is the only real migration
  tool.
- `date` is written with `toIso8601String().substring(0, 10)`, so it is date-only and timezone-free by construction.
  Anything that starts writing a full timestamp breaks the `DateTime.parse` round-trip's equality with the grid's
  date-only keys.
