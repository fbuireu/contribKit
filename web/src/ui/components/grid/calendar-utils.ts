import type { ContributionDay } from "@domain/entities/types";
import { mulberry32 } from "@ui/utils/mulberry";
import { TOTALS_PER_LEVEL } from "./contribution";

export interface Cell {
	date: string;
	level: number;
	count?: number | null;
}

function addDays(iso: string, days: number): string {
	const date = new Date(`${iso}T12:00:00`);
	date.setDate(date.getDate() + days);
	return date.toISOString().slice(0, 10);
}

function getWeekday(iso: string): number {
	return new Date(`${iso}T12:00:00`).getDay();
}

export interface RenderCalendarParams {
	cells: Cell[];
	palette: readonly string[];
	shape?: string;
	size?: number;
	gap?: number;
	showLabels?: boolean;
}

export type CellSummary = { count: number; streak: number; longest: number };

export function buildGridFromApi(days: readonly ContributionDay[], year: number): Cell[] {
	const map = new Map<string, { level: number; count: number | null }>();
	for (const day of days) map.set(day.date, { level: day.level, count: day.count });
	return buildCalendarGrid(map, year);
}

export function rehydrateCells(arr: Array<{ date: string; level: number; count: number | null }>): Cell[] {
	return arr.map(({ date, level, count }) => ({ date, level, count: count ?? null }));
}

export function summarize(cells: Cell[]): CellSummary {
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

export function buildCalendarGrid(map: Map<string, { level: number; count: number | null }>, year: number): Cell[] {
	const jan1 = `${year}-01-01`;
	const start = addDays(jan1, -getWeekday(jan1));
	const cells: Cell[] = [];
	for (let dayOffset = 0; dayOffset < 53 * 7; dayOffset++) {
		const date = addDays(start, dayOffset);
		const entry = map.get(date);
		cells.push({ date, level: entry?.level ?? 0, count: entry?.count ?? null });
	}
	return cells;
}

export function generateData(seed = 7): Cell[] {
	const random = mulberry32(seed);
	const cells: Cell[] = [];
	const today = "2026-05-17";
	const end = addDays(today, 6 - getWeekday(today));
	const totalDays = 53 * 7;
	const start = addDays(end, -(totalDays - 1));

	for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
		const date = addDays(start, dayOffset);
		const dayOfWeek = getWeekday(date);
		const progress = dayOffset / totalDays;
		let base = 0.35 + progress * 0.5;
		if (dayOfWeek === 0 || dayOfWeek === 6) base *= 0.55;
		const cluster = Math.sin(dayOffset / 9) * 0.25 + Math.sin(dayOffset / 23) * 0.2;
		const randomValue = random();
		let score = base + cluster + (randomValue - 0.5) * 0.6;
		if (random() < 0.08) score -= 0.6;
		let level = 0;
		if (score >= 0.2) level = 1;
		if (score >= 0.45) level = 2;
		if (score >= 0.7) level = 3;
		if (score >= 0.95) level = 4;
		cells.push({ date, level });
	}
	return cells;
}
