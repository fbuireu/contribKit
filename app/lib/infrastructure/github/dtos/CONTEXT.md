# infrastructure/github/dtos/

JSON-deserializable transfer objects used to serialize calendars into the Hive cache (the shape mirrors GitHub's `weeks`/`contributionDays` structure).

These types exist only to (de)serialize raw JSON. They must be converted to domain entities (`ContributionCalendar`, `ContributionDay`) before leaving `infrastructure/github/`. Never reference DTOs from `application/` or `ui/`.
