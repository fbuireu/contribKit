import { contributionDay } from "@domain/entities/contribution-day";
import type { ContributionCalendar, ContributionDay } from "@domain/entities/types";
import { type Failure, isFailure, network, notFound, parse, rateLimited } from "@domain/failures/failure";
import type { ContributionRepository, FetchCalendarParams } from "@domain/repositories/types";
import { totalContributionsFor } from "@domain/services/contribution-stats";
import type { Year } from "@domain/value-objects/year";

const USER_AGENT =
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const ORIGIN_CACHE_SECONDS = 3600;
const FETCH_TIMEOUT_MS = 20_000;
const TOO_MANY_REQUESTS = 429;
const TD_REGEX = /<td\b([^>]*ContributionCalendar-day[^>]*)>/g;
const DATE_REGEX = /data-date="(\d{4}-\d{2}-\d{2})"/;
const LEVEL_REGEX = /data-level="(\d)"/;
const ID_REGEX = /\bid="([^"]+)"/;
const TOOLTIP_REGEX = /<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>\s*([\d,\u00a0\u202f]+)/g;
const COUNT_SEPARATORS = /[,\u00a0\u202f]/g;

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
	totalContributions: number | null;
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
		idToCount.set(match[1], Number.parseInt(match[2].replace(COUNT_SEPARATORS, ""), 10));
	}

	const enriched: ContributionDay[] = days
		.map(({ date, level, id }) =>
			contributionDay({ date, level, count: id === null ? null : (idToCount.get(id) ?? null) }),
		)
		.filter((day): day is ContributionDay => !isFailure(day));

	return { days: enriched, totalContributions: totalContributionsFor(enriched) };
};

const RETRY_AFTER_SECONDS = /^\d+$/;
const RETRY_AFTER_HTTP_DATE = /[a-zA-Z]/;

const retryAfterFrom = (header: string | null): number | null => {
	const value = header?.trim();
	if (!value) return null;
	if (RETRY_AFTER_SECONDS.test(value)) return Number(value);
	if (!RETRY_AFTER_HTTP_DATE.test(value)) return null;
	const at = Date.parse(value);
	return Number.isNaN(at) ? null : Math.max(0, Math.round((at - Date.now()) / 1000));
};

export const githubHtmlContributionRepository: ContributionRepository = {
	async fetchCalendar({ username, year }: FetchCalendarParams): Promise<ContributionCalendar | Failure> {
		const url = buildUrl({ username: username.value, year });

		let response: Response;
		try {
			response = await fetch(url, {
				redirect: "follow",
				signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
				cf: { cacheTtl: ORIGIN_CACHE_SECONDS, cacheEverything: true },
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

		if (response.status === 404) return notFound(username);
		if (response.status === TOO_MANY_REQUESTS)
			return rateLimited({
				message: "GitHub is rate-limiting this Worker",
				retryAfterSeconds: retryAfterFrom(response.headers.get("retry-after")),
			});
		if (!response.ok) return network({ message: `GitHub returned ${response.status}`, status: response.status });

		let html: string;
		try {
			html = await response.text();
		} catch (error) {
			return network({ message: error instanceof Error ? error.message : String(error) });
		}

		const { days, totalContributions } = parseHtml(html);
		if (days.length === 0) return parse("Could not parse contributions");

		return { username, year, days, totalContributions };
	},
};
