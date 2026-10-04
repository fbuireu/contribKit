import type { ContributionDay } from "@domain/entities/types";
import { type Failure, isFailure } from "@domain/failures/failure";
import type { ContributionRepository } from "@domain/repositories/types";
import { buildGridFromApi } from "@domain/services/calendar-grid";
import { parseUsername } from "@domain/value-objects/username";
import { currentYear, isYear, parseYear, resolveYear } from "@domain/value-objects/year";
import { messageFor, statusFor } from "../http/failure-http";

type LoadContributions = ContributionRepository["fetchCalendar"];

export interface LoadInitialContributionsParams {
	username: string;
	year?: string | null;
	thisYear: number;
}

export interface InitialContributions {
	days: ContributionDay[];
	totalContributions: number | null;
}

export type LoadContributionsResult = { year: number } & (
	| { ok: true; data: InitialContributions }
	| { ok: false; kind: Failure["kind"]; status: number; message: string }
);

export const loadInitialContributions =
	(loadContributions: LoadContributions) =>
	async ({
		username,
		year: requestedYear,
		thisYear,
	}: LoadInitialContributionsParams): Promise<LoadContributionsResult> => {
		const resolved = parseYear({ requested: resolveYear({ requested: requestedYear, thisYear }), thisYear });
		const year = isYear(resolved) ? resolved : currentYear(thisYear);

		const parsedUsername = parseUsername(username);
		if (isFailure(parsedUsername))
			return {
				ok: false,
				year: year.value,
				kind: parsedUsername.kind,
				status: statusFor(parsedUsername),
				message: messageFor(parsedUsername),
			};

		const result = await loadContributions({ username: parsedUsername, year });
		if (isFailure(result))
			return { ok: false, year: year.value, kind: result.kind, status: statusFor(result), message: messageFor(result) };
		return {
			ok: true,
			year: year.value,
			data: {
				days: buildGridFromApi({ days: result.days, year: year.value }),
				totalContributions: result.totalContributions,
			},
		};
	};
