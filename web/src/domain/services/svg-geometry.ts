import { MONTHS } from "../value-objects/calendar-labels";

export const SVG_PAD_X = 12;
export const SVG_PAD_Y = 12;
export const SVG_LABEL_WIDTH = 28;
export const SVG_LABEL_HEIGHT = 18;
export const SVG_WEEKS = 53;
export const SVG_DAYS_PER_WEEK = 7;
export const SVG_GRID_CELL_COUNT = SVG_WEEKS * SVG_DAYS_PER_WEEK;
export const SVG_DEFAULT_CELL_SIZE = 10;
export const SVG_DEFAULT_CELL_GAP = 2;
export const SVG_MONTH_LABEL_BASELINE = 11;
export const SVG_DOW_LABEL_BASELINE = 4;
export const SVG_MONTH_LABEL_MAX_DAY = 7;
export const SVG_MONTH_LABEL_FONT_SIZE = "9.5";
export const SVG_MONTH_LABEL_LETTER_SPACING = "0.04em";
export const SVG_DOW_LABEL_FONT_SIZE = "9";

const RADIUS_BY_SHAPE: Record<string, number> = { rounded: 2.5, square: 0 };

export interface RadiusForParams {
	shape: string;
	size: number;
}

export const radiusFor = ({ shape, size }: RadiusForParams): number => RADIUS_BY_SHAPE[shape] ?? size / 2;

export const dotRadius = (level: number): number => (level === 0 ? 1.4 : 1.4 + level);

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
		totalWidth: SVG_WEEKS * cellWidth + labelWidth + SVG_PAD_X * 2,
		totalHeight: SVG_DAYS_PER_WEEK * cellWidth + labelHeight + SVG_PAD_Y * 2,
	};
};

export const chunkWeeks = <T>(cells: readonly T[]): T[][] =>
	Array.from({ length: SVG_WEEKS }, (_, weekIndex) =>
		cells.slice(weekIndex * SVG_DAYS_PER_WEEK, (weekIndex + 1) * SVG_DAYS_PER_WEEK),
	);

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
			labels.push({ weekIndex, label: MONTHS[month] });
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
