# infrastructure/github/dtos/

JSON-deserializable transfer objects for the GitHub GraphQL API response.

These types exist only to parse raw JSON. They must be converted to domain entities (`ContributionCalendar`, `ContributionDay`) before leaving `infrastructure/github/`. Never reference DTOs from `application/` or `ui/`.
