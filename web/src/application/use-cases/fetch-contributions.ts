import type { ContributionCalendar } from "@domain/entities/contribution-calendar";
import type { Failure } from "@domain/failures/failure";
import type { ContributionsRepository } from "@domain/repositories/contributions-repository";
import type { Username } from "@domain/value-objects/username";
import type { Year } from "@domain/value-objects/year";

export const fetchContributions =
	(repository: ContributionsRepository) =>
	(username: Username, year: Year | null): Promise<ContributionCalendar | Failure> =>
		repository.fetch({ username, year });
