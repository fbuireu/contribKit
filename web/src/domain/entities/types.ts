import type { ContributionLevel } from "../value-objects/contribution-level";
import type { Username } from "../value-objects/username";

export interface ContributionDay {
	readonly date: string;
	readonly level: ContributionLevel;
	readonly count: number | null;
}

export interface ContributionCalendar {
	readonly username: Username;
	readonly days: readonly ContributionDay[];
	readonly totalContributions: number | null;
}
