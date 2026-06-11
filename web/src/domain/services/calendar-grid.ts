import type { ContributionDay } from "../entities/types";
import { clampLevel } from "../value-objects/contribution-level";
import { addDays, getWeekday } from "./dates";
import { SVG_DAYS_PER_WEEK, SVG_WEEKS } from "./svg-geometry";

const GRID_CELL_COUNT = SVG_WEEKS * SVG_DAYS_PER_WEEK;

export interface DayEntry {
	readonly level: number;
	readonly count: number | null;
}

export interface BuildCalendarGridParams {
	map: Map<string, DayEntry>;
	year: number;
}

export const buildCalendarGrid = ({ map, year }: BuildCalendarGridParams): ContributionDay[] => {
	const jan1 = `${year}-01-01`;
	const start = addDays({ iso: jan1, days: -getWeekday(jan1) });
	const cells: ContributionDay[] = [];
	for (let dayOffset = 0; dayOffset < GRID_CELL_COUNT; dayOffset++) {
		const date = addDays({ iso: start, days: dayOffset });
		const entry = map.get(date);
		cells.push({ date, level: clampLevel(entry?.level ?? 0), count: entry?.count ?? null });
	}
	return cells;
};

export interface BuildGridFromApiParams {
	days: readonly ContributionDay[];
	year: number;
}

export const buildGridFromApi = ({ days, year }: BuildGridFromApiParams): ContributionDay[] => {
	const map = new Map<string, DayEntry>(days.map((day) => [day.date, { level: day.level, count: day.count }]));
	return buildCalendarGrid({ map, year });
};
