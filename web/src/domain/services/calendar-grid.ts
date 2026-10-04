import { emptyDay } from "../entities/contribution-day";
import type { ContributionDay } from "../entities/types";
import type { ContributionLevel } from "../value-objects/contribution-level";
import type { IsoDate } from "../value-objects/iso-date";
import { addDays, DAYS_PER_WEEK, GRID_CELL_COUNT, getWeekday, leadingDaysFor, weeksFor } from "./dates";

interface ContributionDayValues {
	readonly level: ContributionLevel;
	readonly count: number | null;
}

const byDate = (days: readonly ContributionDay[]): Map<IsoDate, ContributionDayValues> =>
	new Map(days.map((day) => [day.date, { level: day.level, count: day.count }]));

interface WalkFromParams {
	readonly start: IsoDate;
	readonly map: Map<IsoDate, ContributionDayValues>;
	readonly length: number;
}

const walkFrom = ({ start, map, length }: WalkFromParams): ContributionDay[] => {
	const days: ContributionDay[] = [];
	for (let dayOffset = 0; dayOffset < length; dayOffset++) {
		const date = addDays({ iso: start, days: dayOffset });
		const entry = map.get(date);
		days.push(entry === undefined ? emptyDay(date) : { date, level: entry.level, count: entry.count });
	}
	return days;
};

export interface BuildGridFromApiParams {
	days: readonly ContributionDay[];
	year: number;
}

export const buildGridFromApi = ({ days, year }: BuildGridFromApiParams): ContributionDay[] => {
	const yearStart = `${year}-01-01` as IsoDate;
	return walkFrom({
		start: addDays({ iso: yearStart, days: -leadingDaysFor(year) }),
		map: byDate(days),
		length: weeksFor(year) * DAYS_PER_WEEK,
	});
};

export const buildRollingGrid = (days: readonly ContributionDay[]): ContributionDay[] => {
	if (days.length === 0) return [];

	const latest = days.reduce((last, day) => (day.date > last ? day.date : last), days[0].date);
	const end = addDays({ iso: latest, days: DAYS_PER_WEEK - 1 - getWeekday(latest) });

	return walkFrom({
		start: addDays({ iso: end, days: -(GRID_CELL_COUNT - 1) }),
		map: byDate(days),
		length: GRID_CELL_COUNT,
	});
};
