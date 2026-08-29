import type { ContributionDay, ContributionWeek } from "../entities/types";
import { MONTH_LABELS, WEEKDAY_LABELS } from "../value-objects/calendar-labels";
import { CellShape } from "../value-objects/cell-shape";
import { type ContributionLevel, clampLevel } from "../value-objects/contribution-level";
import { DAYS_PER_WEEK, weeksOf } from "./dates";

const SVG_PAD_X = 12;
const SVG_PAD_Y = 12;
const SVG_LABEL_WIDTH = 28;
const SVG_LABEL_HEIGHT = 18;
export const SVG_DEFAULT_CELL_SIZE = 10;
export const SVG_DEFAULT_CELL_GAP = 2;
const SVG_MONTH_LABEL_BASELINE = 11;
const SVG_WEEKDAY_LABEL_BASELINE = 4;
const SVG_MONTH_LABEL_MAX_DAY = 7;
export const SVG_MONTH_LABEL_FONT_SIZE = "9.5";
export const SVG_MONTH_LABEL_LETTER_SPACING = "0.04em";
export const SVG_WEEKDAY_LABEL_FONT_SIZE = "9";
const DOT_BASE_RADIUS = 1.4;
const DOT_REFERENCE_CELL_SIZE = 10;
const CORNER_RADIUS_RATIO = 0.2;

export const CALENDAR_ARIA_LABEL = "GitHub contribution calendar";

export interface Point {
	readonly x: number;
	readonly y: number;
}

export interface DotRadiusParams {
	level: number;
	size: number;
}

export const dotRadius = ({ level, size }: DotRadiusParams): number =>
	(level === 0 ? DOT_BASE_RADIUS : DOT_BASE_RADIUS + level) * (size / DOT_REFERENCE_CELL_SIZE);

export const cornerRadiusFor = (size: number): number => size * CORNER_RADIUS_RATIO;

interface RadiusForParams {
	shape: CellShape;
	size: number;
}

const radiusFor = ({ shape, size }: RadiusForParams): number => {
	switch (shape) {
		case CellShape.Rounded:
			return cornerRadiusFor(size);
		case CellShape.Square:
			return 0;
		case CellShape.Circle:
		case CellShape.Dot:
		case CellShape.Hex:
			return size / 2;
	}
};

export interface HexPointsParams {
	cx: number;
	cy: number;
	radius: number;
}

export const hexPoints = ({ cx, cy, radius }: HexPointsParams): string => {
	const points: string[] = [];
	for (let vertex = 0; vertex < 6; vertex++) {
		const angle = (Math.PI / 3) * vertex + Math.PI / 6;
		points.push(`${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`);
	}
	return points.join(" ");
};

const monthLabelsFor = (weeks: readonly ContributionWeek[]): Array<{ weekIndex: number; label: string }> => {
	const labels: Array<{ weekIndex: number; label: string }> = [];
	let lastMonth = -1;
	weeks.forEach((week, weekIndex) => {
		const first = week[0];
		if (!first) return;
		const month = Number.parseInt(first.date.slice(5, 7), 10) - 1;
		if (month !== lastMonth && Number.parseInt(first.date.slice(8, 10), 10) <= SVG_MONTH_LABEL_MAX_DAY) {
			labels.push({ weekIndex, label: MONTH_LABELS[month] });
			lastMonth = month;
		}
	});
	return labels;
};

export interface CalendarLabelPlacement extends Point {
	readonly label: string;
}

export interface CalendarCellPlacement extends Point {
	readonly date: string;
	readonly level: ContributionLevel;
	readonly count: number | null;
}

export interface CalendarLayout {
	readonly width: number;
	readonly height: number;
	readonly size: number;
	readonly radius: number;
	readonly origin: Point;
	readonly monthLabels: readonly CalendarLabelPlacement[];
	readonly weekdayLabels: readonly CalendarLabelPlacement[];
	readonly cells: readonly CalendarCellPlacement[];
}

export interface CalendarLayoutParams {
	days: readonly ContributionDay[];
	shape: CellShape;
	size?: number;
	gap?: number;
	showLabels?: boolean;
}

export const calendarLayout = ({
	days,
	shape,
	size = SVG_DEFAULT_CELL_SIZE,
	gap = SVG_DEFAULT_CELL_GAP,
	showLabels = true,
}: CalendarLayoutParams): CalendarLayout => {
	const cellWidth = size + gap;
	const labelWidth = showLabels ? SVG_LABEL_WIDTH : 0;
	const labelHeight = showLabels ? SVG_LABEL_HEIGHT : 0;
	const weeks = weeksOf(days);

	const monthLabels: CalendarLabelPlacement[] = showLabels
		? monthLabelsFor(weeks).map(({ weekIndex, label }) => ({
				x: SVG_PAD_X + labelWidth + weekIndex * cellWidth,
				y: SVG_PAD_Y + SVG_MONTH_LABEL_BASELINE,
				label,
			}))
		: [];

	const weekdayLabels: CalendarLabelPlacement[] = showLabels
		? WEEKDAY_LABELS.map((label, index) => ({
				x: SVG_PAD_X,
				y: SVG_PAD_Y + labelHeight + (index * 2 + 1) * cellWidth + SVG_WEEKDAY_LABEL_BASELINE,
				label,
			}))
		: [];

	const cells: CalendarCellPlacement[] = [];
	weeks.forEach((week, weekIndex) => {
		week.forEach((day, dayIndex) => {
			cells.push({
				x: weekIndex * cellWidth,
				y: dayIndex * cellWidth,
				date: day.date,
				level: clampLevel(day.level),
				count: day.count,
			});
		});
	});

	return {
		width: weeks.length * cellWidth + labelWidth + SVG_PAD_X * 2,
		height: DAYS_PER_WEEK * cellWidth + labelHeight + SVG_PAD_Y * 2,
		size,
		radius: radiusFor({ shape, size }),
		origin: { x: SVG_PAD_X + labelWidth, y: SVG_PAD_Y + labelHeight },
		monthLabels,
		weekdayLabels,
		cells,
	};
};
