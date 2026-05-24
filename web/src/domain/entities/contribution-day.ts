import type { ContributionLevel } from "../value-objects/contribution-level";

export interface ContributionDay {
	readonly date: string;
	readonly level: ContributionLevel;
	readonly count: number | null;
}
