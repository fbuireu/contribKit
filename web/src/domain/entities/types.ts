import type { ContributionLevel } from "../value-objects/contribution-level";

export interface ContributionDay {
	readonly date: string;
	readonly level: ContributionLevel;
	readonly count: number | null;
}

export interface ContributionCalendar {
	readonly username: string;
	readonly days: readonly ContributionDay[];
	readonly total: number | null;
}
