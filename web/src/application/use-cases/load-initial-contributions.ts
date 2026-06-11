import type { ContributionDay } from "@domain/entities/types";
import { isFailure } from "@domain/failures/failure";
import { buildGridFromApi } from "@domain/services/calendar-grid";
import { DEFAULT_USERNAME, parseUsername } from "@domain/value-objects/username";
import { isYear, parseYear } from "@domain/value-objects/year";
import { messageFor, statusFor } from "../http/failure-http";
import type { fetchContributions } from "./fetch-contributions";

type LoadContributions = ReturnType<typeof fetchContributions>;

export interface LoadInitialContributionsParams {
	username?: string;
	year?: number | string | null;
}

export interface InitialContributions {
	cells: ContributionDay[];
	total: number | null;
	year: number;
}

export type LoadContributionsResult =
	| { ok: true; data: InitialContributions }
	| { ok: false; status: number; message: string };

export const loadInitialContributions =
	(loadContributions: LoadContributions) =>
	async ({
		username = DEFAULT_USERNAME,
		year: requestedYear,
	}: LoadInitialContributionsParams = {}): Promise<LoadContributionsResult> => {
		const parsedUsername = parseUsername(username);
		if (isFailure(parsedUsername))
			return { ok: false, status: statusFor(parsedUsername), message: messageFor(parsedUsername) };
		const currentYear = new Date().getFullYear();
		const requested = parseYear(requestedYear);
		const resolvedYear = !isFailure(requested) && isYear(requested) ? requested.value : currentYear;
		const year = parseYear(String(resolvedYear));
		const yearValue = !isFailure(year) && isYear(year) ? year : null;

		const result = await loadContributions({ username: parsedUsername, year: yearValue });
		if (isFailure(result)) return { ok: false, status: statusFor(result), message: messageFor(result) };
		return {
			ok: true,
			data: {
				cells: buildGridFromApi({ days: result.days, year: resolvedYear }),
				total: result.total,
				year: resolvedYear,
			},
		};
	};
