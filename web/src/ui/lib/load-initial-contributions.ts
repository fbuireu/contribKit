import { fetchContributions } from "@application/use-cases/fetch-contributions";
import { DEFAULT_USERNAME, parseUsername } from "@domain/value-objects/username";
import { isYear, parseYear } from "@domain/value-objects/year";
import { createGithubHtmlContributionsRepository } from "@infrastructure/github/create-github-html-contributions-repository";
import { buildGridFromApi, type Cell } from "@ui/lib/calendar-utils";
import { isFailure, messageFor, statusFor } from "@ui/lib/failure-http";

export interface InitialContributions {
	cells: Cell[];
	total: number | null;
	year: number;
}

export type LoadContributionsResult =
	| { ok: true; data: InitialContributions }
	| { ok: false; status: number; message: string };

const repo = createGithubHtmlContributionsRepository();
const loadContributions = fetchContributions(repo);

export async function loadInitialContributions(
	requestedUsername: string = DEFAULT_USERNAME,
): Promise<LoadContributionsResult> {
	const username = parseUsername(requestedUsername);
	if (isFailure(username)) return { ok: false, status: statusFor(username), message: messageFor(username) };
	// TODO: migrate to Temporal once it's natively available in Node and all target browsers
	const currentYear = new Date().getFullYear();
	const year = parseYear(String(currentYear));
	const yearValue = !isFailure(year) && isYear(year) ? year : null;

	const result = await loadContributions(username, yearValue);
	if (isFailure(result)) return { ok: false, status: statusFor(result), message: messageFor(result) };
	return {
		ok: true,
		data: {
			cells: buildGridFromApi(result.days, currentYear),
			total: result.total,
			year: currentYear,
		},
	};
}
