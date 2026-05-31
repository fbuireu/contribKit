import { fetchContributions } from "@application/use-cases/fetch-contributions";
import { DEFAULT_USERNAME, parseUsername } from "@domain/value-objects/username";
import { isYear, parseYear } from "@domain/value-objects/year";
import { createGithubHtmlContributionsRepository } from "@infrastructure/github/create-github-html-contributions-repository";
import { buildGridFromApi, type Cell } from "@ui/lib/calendar-utils";
import { isFailure } from "@ui/lib/failure-http";

export interface InitialContributions {
	cells: Cell[];
	total: number | null;
	year: number;
}

const repo = createGithubHtmlContributionsRepository();
const loadContributions = fetchContributions(repo);

export async function loadInitialContributions(): Promise<InitialContributions | null> {
	const username = parseUsername(DEFAULT_USERNAME);
	if (isFailure(username)) return null;
	// TODO: migrate to Temporal once it's natively available in Node and all target browsers
	const currentYear = new Date().getFullYear();
	const year = parseYear(String(currentYear));
	if (isFailure(year)) return null;
	const yearValue = isYear(year) ? year : null;

	const result = await loadContributions(username, yearValue);
	if (isFailure(result)) return null;
	return {
		cells: buildGridFromApi(result.days, currentYear),
		total: result.total,
		year: currentYear,
	};
}
