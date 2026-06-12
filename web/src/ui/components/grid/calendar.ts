import type { ContributionDay } from "@domain/entities/types";
import { addDays, getWeekday, toIsoDate } from "@domain/services/dates";
import { SVG_GRID_CELL_COUNT } from "@domain/services/svg-geometry";
import { mulberry32 } from "@ui/utils/mulberry";
import { TOTALS_PER_LEVEL } from "./contribution";

const LEVEL_THRESHOLDS = [
	{ minScore: 0.95, level: 4 },
	{ minScore: 0.7, level: 3 },
	{ minScore: 0.45, level: 2 },
	{ minScore: 0.2, level: 1 },
] as const;

export interface RenderCalendarParams {
	cells: ContributionDay[];
	palette: readonly string[];
	shape?: string;
	size?: number;
	gap?: number;
	showLabels?: boolean;
}

export interface CellSummary {
	count: number;
	streak: number;
	longest: number;
}

export function summarize(cells: readonly ContributionDay[]): CellSummary {
	const sorted = [...cells].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
	let count = 0,
		streak = 0,
		longest = 0,
		currentStreak = 0;
	for (const cell of sorted) {
		count += cell.count ?? TOTALS_PER_LEVEL[cell.level] ?? 0;
		if (cell.level > 0) {
			currentStreak++;
			if (currentStreak > longest) longest = currentStreak;
		} else currentStreak = 0;
	}
	for (let index = sorted.length - 1; index >= 0; index--) {
		if (sorted[index].level > 0) streak++;
		else break;
	}
	return { count, streak, longest };
}

export function generateData(seed = 7): ContributionDay[] {
	const random = mulberry32(seed);
	const cells: ContributionDay[] = [];
	const today = toIsoDate(new Date());
	const end = addDays({ iso: today, days: 6 - getWeekday(today) });
	const totalDays = SVG_GRID_CELL_COUNT;
	const start = addDays({ iso: end, days: -(totalDays - 1) });

	for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
		const date = addDays({ iso: start, days: dayOffset });
		const dayOfWeek = getWeekday(date);
		const progress = dayOffset / totalDays;
		let base = 0.35 + progress * 0.5;
		if (dayOfWeek === 0 || dayOfWeek === 6) base *= 0.55;
		const cluster = Math.sin(dayOffset / 9) * 0.25 + Math.sin(dayOffset / 23) * 0.2;
		const randomValue = random();
		let score = base + cluster + (randomValue - 0.5) * 0.6;
		if (random() < 0.08) score -= 0.6;
		const level = LEVEL_THRESHOLDS.find(({ minScore }) => score >= minScore)?.level ?? 0;
		cells.push({ date, level, count: null });
	}
	return cells;
}
