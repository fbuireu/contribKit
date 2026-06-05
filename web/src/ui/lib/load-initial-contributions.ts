import type { fetchContributions } from "@application/use-cases/fetch-contributions";
import { DEFAULT_USERNAME, parseUsername } from "@domain/value-objects/username";
import { isYear, parseYear } from "@domain/value-objects/year";
import { buildGridFromApi, type Cell } from "./calendar-utils";
import { isFailure, messageFor, statusFor } from "./failure-http";

type LoadContributions = ReturnType<typeof fetchContributions>;

export interface LoadInitialContributionsParams {
	loadContributions: LoadContributions;
	username?: string;
	year?: number | string | null;
}

export interface InitialContributions {
	cells: Cell[];
	total: number | null;
	year: number;
}

export type LoadContributionsResult =
	| { ok: true; data: InitialContributions }
	| { ok: false; status: number; message: string };

export async function loadInitialContributions({
	loadContributions,
	username = DEFAULT_USERNAME,
	year: requestedYear,
}: LoadInitialContributionsParams): Promise<LoadContributionsResult> {
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
			cells: buildGridFromApi(result.days, resolvedYear),
			total: result.total,
			year: resolvedYear,
		},
	};
}
