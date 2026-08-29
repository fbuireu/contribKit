import { type Failure, isFailure } from "../failures/failure";
import { clampLevel } from "../value-objects/contribution-level";
import { type IsoDate, parseIsoDate } from "../value-objects/iso-date";
import type { ContributionDay } from "./types";

export interface ContributionDayParams {
	readonly date: string;
	readonly level: number;
	readonly count: number | null;
}

export const contributionDay = ({ date, level, count }: ContributionDayParams): ContributionDay | Failure => {
	const parsed = parseIsoDate(date);
	if (isFailure(parsed)) return parsed;
	return { date: parsed, level: clampLevel(level), count };
};

export interface EmptyDayParams {
	readonly date: IsoDate;
}

export const emptyDay = ({ date }: EmptyDayParams): ContributionDay => ({ date, level: 0, count: null });
