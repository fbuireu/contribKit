import type { ContributionDay } from "@domain/entities/types";
import { type Failure, isFailure } from "@domain/failures/failure";
import type { ContributionsRepository } from "@domain/repositories/types";
import { buildGridFromApi } from "@domain/services/calendar-grid";
import { DEFAULT_USERNAME, parseUsername } from "@domain/value-objects/username";
import { currentYear, isYear, parseYear } from "@domain/value-objects/year";
import { messageFor, statusFor } from "../http/failure-http";

type LoadContributions = ContributionsRepository["fetch"];

export interface LoadInitialContributionsParams {
	username?: string;
	year?: number | string | null;
}

export interface InitialContributions {
	days: ContributionDay[];
	totalContributions: number | null;
	year: number;
}

export type LoadContributionsResult =
	| { ok: true; data: InitialContributions }
	| { ok: false; kind: Failure["kind"]; status: number; message: string };

export const loadInitialContributions =
	(loadContributions: LoadContributions) =>
	async ({
		username = DEFAULT_USERNAME,
		year: requestedYear,
	}: LoadInitialContributionsParams = {}): Promise<LoadContributionsResult> => {
		const parsedUsername = parseUsername(username);
		if (isFailure(parsedUsername))
			return {
				ok: false,
				kind: parsedUsername.kind,
				status: statusFor(parsedUsername),
				message: messageFor(parsedUsername),
			};

		const requested = parseYear(requestedYear);
		const year = isYear(requested) ? requested : currentYear();

		const result = await loadContributions({ username: parsedUsername, year });
		if (isFailure(result))
			return { ok: false, kind: result.kind, status: statusFor(result), message: messageFor(result) };
		return {
			ok: true,
			data: {
				days: buildGridFromApi({ days: result.days, year: year.value }),
				totalContributions: result.totalContributions,
				year: year.value,
			},
		};
	};
