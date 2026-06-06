import type { ContributionCalendar } from "../entities/types";
import type { Failure } from "../failures/failure";
import type { Username } from "../value-objects/username";
import type { Year } from "../value-objects/year";

export interface FetchContributionsParams {
	username: Username;
	year: Year | null;
}

export interface ContributionsRepository {
	fetch(params: FetchContributionsParams): Promise<ContributionCalendar | Failure>;
}
