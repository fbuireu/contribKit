import type { ContributionCalendar } from "@domain/entities/contribution-calendar";
import type { Failure } from "@domain/failures/failure";
import type { ContributionsRepository, FetchContributionsParams } from "@domain/repositories/contributions-repository";

export const fetchContributions =
	(repository: ContributionsRepository) =>
	(params: FetchContributionsParams): Promise<ContributionCalendar | Failure> =>
		repository.fetch(params);
