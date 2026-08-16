import type { ContributionDay } from "../entities/types";
import { clampLevel } from "../value-objects/contribution-level";
import { addDays, DAYS_PER_WEEK, GRID_CELL_COUNT, getWeekday } from "./dates";

interface ContributionDayValues {
	readonly level: number;
	readonly count: number | null;
}

const byDate = (days: readonly ContributionDay[]): Map<string, ContributionDayValues> =>
	new Map(days.map((day) => [day.date, { level: day.level, count: day.count }]));

const walkFrom = ({ start, map }: { start: string; map: Map<string, ContributionDayValues> }): ContributionDay[] => {
	const days: ContributionDay[] = [];
	for (let dayOffset = 0; dayOffset < GRID_CELL_COUNT; dayOffset++) {
		const date = addDays({ iso: start, days: dayOffset });
		const entry = map.get(date);
		days.push({ date, level: clampLevel(entry?.level ?? 0), count: entry?.count ?? null });
	}
	return days;
};

export interface BuildGridFromApiParams {
	days: readonly ContributionDay[];
	year: number;
}

export const buildGridFromApi = ({ days, year }: BuildGridFromApiParams): ContributionDay[] => {
	const yearStart = `${year}-01-01`;
	return walkFrom({ start: addDays({ iso: yearStart, days: -getWeekday(yearStart) }), map: byDate(days) });
};

export interface BuildRollingGridParams {
	days: readonly ContributionDay[];
}

export const buildRollingGrid = ({ days }: BuildRollingGridParams): ContributionDay[] => {
	if (days.length === 0) return [];

	const latest = days.reduce((last, day) => (day.date > last ? day.date : last), days[0].date);
	const end = addDays({ iso: latest, days: DAYS_PER_WEEK - 1 - getWeekday(latest) });

	return walkFrom({ start: addDays({ iso: end, days: -(GRID_CELL_COUNT - 1) }), map: byDate(days) });
};
