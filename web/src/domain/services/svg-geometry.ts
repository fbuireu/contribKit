import { MONTH_LABELS } from "../value-objects/calendar-labels";
import { DAYS_PER_WEEK, WEEKS_PER_YEAR } from "./dates";

export const SVG_PAD_X = 12;
export const SVG_PAD_Y = 12;
export const SVG_LABEL_WIDTH = 28;
export const SVG_LABEL_HEIGHT = 18;
export const SVG_DEFAULT_CELL_SIZE = 10;
export const SVG_DEFAULT_CELL_GAP = 2;
export const SVG_MONTH_LABEL_BASELINE = 11;
export const SVG_WEEKDAY_LABEL_BASELINE = 4;
export const SVG_MONTH_LABEL_MAX_DAY = 7;
export const SVG_MONTH_LABEL_FONT_SIZE = "9.5";
export const SVG_MONTH_LABEL_LETTER_SPACING = "0.04em";
export const SVG_WEEKDAY_LABEL_FONT_SIZE = "9";
export const DOT_BASE_RADIUS = 1.4;
const RADIUS_BY_SHAPE: Record<string, number> = { rounded: 2.5, square: 0 };

export interface RadiusForParams {
	shape: string;
	size: number;
}

export const radiusFor = ({ shape, size }: RadiusForParams): number => RADIUS_BY_SHAPE[shape] ?? size / 2;

export const dotRadius = (level: number): number => (level === 0 ? DOT_BASE_RADIUS : DOT_BASE_RADIUS + level);

export interface CalendarDimensionsParams {
	size: number;
	gap: number;
	showLabels: boolean;
}

export interface CalendarDimensions {
	cellWidth: number;
	labelWidth: number;
	labelHeight: number;
	totalWidth: number;
	totalHeight: number;
}

export const calendarDimensions = ({ size, gap, showLabels }: CalendarDimensionsParams): CalendarDimensions => {
	const cellWidth = size + gap;
	const labelWidth = showLabels ? SVG_LABEL_WIDTH : 0;
	const labelHeight = showLabels ? SVG_LABEL_HEIGHT : 0;
	return {
		cellWidth,
		labelWidth,
		labelHeight,
		totalWidth: WEEKS_PER_YEAR * cellWidth + labelWidth + SVG_PAD_X * 2,
		totalHeight: DAYS_PER_WEEK * cellWidth + labelHeight + SVG_PAD_Y * 2,
	};
};

export interface MonthLabelPosition {
	weekIndex: number;
	label: string;
}

export const monthLabelPositions = (weeks: ReadonlyArray<ReadonlyArray<{ date: string }>>): MonthLabelPosition[] => {
	const labels: MonthLabelPosition[] = [];
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
