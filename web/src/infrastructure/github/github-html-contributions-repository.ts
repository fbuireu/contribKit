import type { ContributionCalendar, ContributionDay } from "@domain/entities/types";
import { type Failure, network, notFound, parse } from "@domain/failures/failure";
import type { ContributionsRepository, FetchContributionsParams } from "@domain/repositories/types";
import { clampLevel } from "@domain/value-objects/contribution-level";
import type { Year } from "@domain/value-objects/year";

const USER_AGENT =
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const TD_REGEX = /<td\b([^>]*ContributionCalendar-day[^>]*)>/g;
const DATE_REGEX = /data-date="(\d{4}-\d{2}-\d{2})"/;
const LEVEL_REGEX = /data-level="(\d)"/;
const ID_REGEX = /\bid="([^"]+)"/;
const TOOLTIP_REGEX = /<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>\s*(\d+)/g;

interface BuildUrlParams {
	username: string;
	year: Year | null;
}

const buildUrl = ({ username, year }: BuildUrlParams): string => {
	const url = new URL(`https://github.com/users/${encodeURIComponent(username)}/contributions`);
	if (year) {
		const now = new Date().getFullYear();
		url.searchParams.set("from", `${year.value}-01-01`);
		if (year.value < now) url.searchParams.set("to", `${year.value}-12-31`);
	}
	return String(url);
};

interface RawDay {
	date: string;
	level: number;
	id: string | null;
}
interface ParseHtmlReturnType {
	days: ContributionDay[];
	total: number | null;
}

const parseHtml = (html: string): ParseHtmlReturnType => {
	const days: RawDay[] = [];
	const idToCount = new Map<string, number>();

	for (const match of html.matchAll(TD_REGEX)) {
		const attributes = match[1];
		const date = DATE_REGEX.exec(attributes)?.[1];
		const level = LEVEL_REGEX.exec(attributes)?.[1];
		const id = ID_REGEX.exec(attributes)?.[1] ?? null;
		if (date && level !== undefined) {
			days.push({ date, level: Number.parseInt(level, 10), id });
		}
	}

	for (const match of html.matchAll(TOOLTIP_REGEX)) {
		idToCount.set(match[1], Number.parseInt(match[2], 10));
	}

	const enriched: ContributionDay[] = days.map(({ date, level, id }) => ({
		date,
		level: clampLevel(level),
		count: id === null ? null : (idToCount.get(id) ?? null),
	}));

	return { days: enriched, total: totalFor(enriched) };
};

const totalFor = (days: readonly ContributionDay[]): number | null => {
	let total = 0;
	for (const day of days) {
		if (day.count === null) {
			if (day.level > 0) return null;
			continue;
		}
		total += day.count;
	}
	return total;
};

export const githubHtmlContributionsRepository: ContributionsRepository = {
	async fetch({ username, year }: FetchContributionsParams): Promise<ContributionCalendar | Failure> {
		const url = buildUrl({ username: username.value, year });

		let response: Response;
		try {
			response = await fetch(url, {
				redirect: "follow",
				headers: {
					"User-Agent": USER_AGENT,
					Accept: "text/html, */*",
					"Accept-Language": "en-US,en;q=0.9",
					"X-Requested-With": "XMLHttpRequest",
					Referer: `https://github.com/${encodeURIComponent(username.value)}`,
				},
			});
		} catch (error) {
			return network({ message: error instanceof Error ? error.message : String(error) });
		}

		if (response.status === 404) return notFound(username.value);
		if (!response.ok) return network({ message: `GitHub returned ${response.status}`, status: response.status });

		const html = await response.text();
		const { days, total } = parseHtml(html);
		if (days.length === 0) return parse("Could not parse contributions");

		return { username: username.value, days, total };
	},
};
