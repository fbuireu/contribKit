import type { ContributionDay } from "../entities/types";
import { clampLevel } from "../value-objects/contribution-level";
import { addDays, GRID_CELL_COUNT, getWeekday } from "./dates";

export interface ContributionDayValues {
	readonly level: number;
	readonly count: number | null;
}

export interface BuildCalendarGridParams {
	map: Map<string, ContributionDayValues>;
	year: number;
}

export const buildCalendarGrid = ({ map, year }: BuildCalendarGridParams): ContributionDay[] => {
	const yearStart = `${year}-01-01`;
	const start = addDays({ iso: yearStart, days: -getWeekday(yearStart) });
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
	const map = new Map<string, ContributionDayValues>(
		days.map((day) => [day.date, { level: day.level, count: day.count }]),
	);
	return buildCalendarGrid({ map, year });
};
