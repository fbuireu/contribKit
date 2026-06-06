import type { ContributionCalendar } from "@domain/entities/types";
import type { Failure } from "@domain/failures/failure";
import type { ContributionsRepository, FetchContributionsParams } from "@domain/repositories/types";

export const fetchContributions =
	(repository: ContributionsRepository) =>
	(params: FetchContributionsParams): Promise<ContributionCalendar | Failure> =>
		repository.fetch(params);
