import type { ContributionDay } from "@domain/entities/types";
import {
	type ContributionStats,
	statsWithScrapedTotalContributions,
	UNKNOWN_CONTRIBUTION_STATS,
} from "@domain/services/contribution-stats";
import type { IsoDate } from "@domain/value-objects/iso-date";
import {
	FIRST_SUGGESTED_USERNAME,
	isUsername,
	MAX_USERNAME_LENGTH,
	parseUsername,
} from "@domain/value-objects/username";
import { PRIVATE_CACHEABLE_ANSWER, PRIVATE_NOT_CACHEABLE } from "../http/cache-control";

export const DaySource = {
	Loaded: "loaded",
	Empty: "empty",
	Placeholder: "placeholder",
} as const;

export type DaySource = (typeof DaySource)[keyof typeof DaySource];

const OVERLONG_USERNAME_LIMIT = MAX_USERNAME_LENGTH + 1;

export interface ResolveViewerIdentityParams {
	requestedUsername?: string | null;
	savedUsername?: string | null;
}

export interface ViewerIdentity {
	username: string;
	isExplicit: boolean;
}

const asRequested = (raw?: string | null): string | undefined => {
	const trimmed = raw?.trim();
	if (!trimmed) return undefined;
	return trimmed.slice(0, OVERLONG_USERNAME_LIMIT);
};

const asSaved = (raw?: string | null): string | undefined => {
	const trimmed = raw?.trim();
	if (!trimmed) return undefined;
	const parsed = parseUsername(trimmed);
	return isUsername(parsed) ? parsed.value : undefined;
};

export const resolveViewerIdentity = ({
	requestedUsername,
	savedUsername,
}: ResolveViewerIdentityParams): ViewerIdentity => {
	const chosen = asRequested(requestedUsername) ?? asSaved(savedUsername);

	return {
		username: chosen ?? FIRST_SUGGESTED_USERNAME,
		isExplicit: chosen !== undefined,
	};
};

export interface DaySourceForParams {
	loaded: boolean;
	isExplicit: boolean;
}

export const daySourceFor = ({ loaded, isExplicit }: DaySourceForParams): DaySource => {
	if (loaded) return DaySource.Loaded;
	return isExplicit ? DaySource.Empty : DaySource.Placeholder;
};

export interface CacheControlForParams {
	loaded: boolean;
	isExplicit: boolean;
}

export const cacheControlFor = ({ loaded, isExplicit }: CacheControlForParams): string =>
	loaded && isExplicit ? PRIVATE_CACHEABLE_ANSWER : PRIVATE_NOT_CACHEABLE;

export interface InitialStatsForParams {
	source: DaySource;
	days: readonly ContributionDay[];
	year: number;
	today: IsoDate;
	scrapedTotalContributions: number | null;
}

export const initialStatsFor = ({
	source,
	days,
	year,
	today,
	scrapedTotalContributions,
}: InitialStatsForParams): ContributionStats =>
	source === DaySource.Empty
		? UNKNOWN_CONTRIBUTION_STATS
		: statsWithScrapedTotalContributions({ days, year, today, scrapedTotalContributions });
