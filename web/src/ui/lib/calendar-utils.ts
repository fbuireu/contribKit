import type { ContributionDay } from "../../domain/entities/types";
import { DOW, MONTHS } from "../../domain/value-objects/calendar-labels";
import { TOTALS_PER_LEVEL } from "./contribution";
import { mulberry32 } from "./mulberry";

export { DOW, MONTHS };

// TODO: migrate to Temporal once it's natively available in all target browsers

export interface Cell {
	date: string;
	level: number;
	count?: number | null;
}

function addDays(iso: string, n: number): string {
	const d = new Date(`${iso}T12:00:00`);
	d.setDate(d.getDate() + n);
	return d.toISOString().slice(0, 10);
}

function getWeekday(iso: string): number {
	return new Date(`${iso}T12:00:00`).getDay(); // 0=Sun, 1=Mon … 6=Sat
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
		cur = 0;
	for (const cell of sorted) {
		count += cell.count ?? TOTALS_PER_LEVEL[cell.level] ?? 0;
		if (cell.level > 0) {
			cur++;
			if (cur > longest) longest = cur;
		} else cur = 0;
	}
	for (let i = sorted.length - 1; i >= 0; i--) {
		if (sorted[i].level > 0) streak++;
		else break;
	}
	return { count, streak, longest };
}

export function buildCalendarGrid(map: Map<string, { level: number; count: number | null }>, year: number): Cell[] {
	const jan1 = `${year}-01-01`;
	const start = addDays(jan1, -getWeekday(jan1)); // back to Sunday
	const cells: Cell[] = [];
	for (let i = 0; i < 53 * 7; i++) {
		const date = addDays(start, i);
		const entry = map.get(date);
		cells.push({ date, level: entry?.level ?? 0, count: entry?.count ?? null });
	}
	return cells;
}

export function generateData(seed = 7): Cell[] {
	const rand = mulberry32(seed);
	const cells: Cell[] = [];
	const today = "2026-05-17";
	const end = addDays(today, 6 - getWeekday(today)); // forward to Saturday
	const totalDays = 53 * 7;
	const start = addDays(end, -(totalDays - 1));

	for (let i = 0; i < totalDays; i++) {
		const date = addDays(start, i);
		const dow = getWeekday(date);
		const progress = i / totalDays;
		let base = 0.35 + progress * 0.5;
		if (dow === 0 || dow === 6) base *= 0.55;
		const cluster = Math.sin(i / 9) * 0.25 + Math.sin(i / 23) * 0.2;
		const randomValue = rand();
		let score = base + cluster + (randomValue - 0.5) * 0.6;
		if (rand() < 0.08) score -= 0.6;
		let level = 0;
		if (score >= 0.2) level = 1;
		if (score >= 0.45) level = 2;
		if (score >= 0.7) level = 3;
		if (score >= 0.95) level = 4;
		cells.push({ date, level });
	}
	return cells;
}
