import type { ContributionDay } from "../entities/types";
import { clampLevel } from "../value-objects/contribution-level";
import { addDays, DAYS_PER_WEEK, GRID_CELL_COUNT, getWeekday } from "./dates";

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

export interface BuildRollingGridParams {
	days: readonly ContributionDay[];
}

export const buildRollingGrid = ({ days }: BuildRollingGridParams): ContributionDay[] => {
	if (days.length === 0) return [];

	const map = new Map<string, ContributionDayValues>(
		days.map((day) => [day.date, { level: day.level, count: day.count }]),
	);
	const latest = days.reduce((last, day) => (day.date > last ? day.date : last), days[0].date);
	const end = addDays({ iso: latest, days: DAYS_PER_WEEK - 1 - getWeekday(latest) });
	const start = addDays({ iso: end, days: -(GRID_CELL_COUNT - 1) });

	const grid: ContributionDay[] = [];
	for (let dayOffset = 0; dayOffset < GRID_CELL_COUNT; dayOffset++) {
		const date = addDays({ iso: start, days: dayOffset });
		const entry = map.get(date);
		grid.push({ date, level: clampLevel(entry?.level ?? 0), count: entry?.count ?? null });
	}
	return grid;
};
