import type { ContributionLevel } from "../value-objects/contribution-level";
import type { Username } from "../value-objects/username";
import type { Year } from "../value-objects/year";

export interface ContributionDay {
	readonly date: string;
	readonly level: ContributionLevel;
	readonly count: number | null;
}

export type ContributionWeek = readonly ContributionDay[];

export interface ContributionCalendar {
	readonly username: Username;
	readonly year: Year | null;
	readonly days: readonly ContributionDay[];
	readonly totalContributions: number | null;
}
