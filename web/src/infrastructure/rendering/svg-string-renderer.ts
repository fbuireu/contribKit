import type { SvgRenderer, SvgRendererParams } from "@domain/services/svg-renderer";
import { DOW, MONTHS } from "@domain/value-objects/calendar-labels";
import type { ShapeKind } from "@domain/value-objects/shape";

const PAD_X = 12;
const PAD_Y = 12;
const LABEL_W = 28;
const LABEL_H = 18;
const DEFAULT_CELL_SIZE = 10;
const DEFAULT_CELL_GAP = 2;
const WEEKS = 53;
const DAYS_PER_WEEK = 7;
const MONTH_LABEL_BASELINE_OFFSET = 11;
const DOW_LABEL_BASELINE_OFFSET = 4;
const MONTH_LABEL_MAX_DAY = 7;
const LABEL_FONT_FAMILY = "ui-monospace,monospace";
const MONTH_LABEL_FILL = "rgba(255,255,255,0.45)";
const MONTH_LABEL_FONT_SIZE = "9.5";
const MONTH_LABEL_LETTER_SPACING = "0.04em";
const DOW_LABEL_FILL = "rgba(255,255,255,0.35)";
const DOW_LABEL_FONT_SIZE = "9";

const RADIUS_BY_SHAPE: Partial<Record<ShapeKind, number>> = {
	rounded: 2.5,
	square: 0,
};

const renderRect = (x: number, y: number, size: number, radius: number, fill: string): string =>
	`<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="${fill}"/>`;

const renderCircle = (cx: number, cy: number, r: number, fill: string): string =>
	`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;

const renderHex = (cx: number, cy: number, s: number, fill: string): string => {
	const pts: string[] = [];
	for (let i = 0; i < 6; i++) {
		const a = (Math.PI / 3) * i + Math.PI / 6;
		pts.push(`${(cx + s * Math.cos(a)).toFixed(2)},${(cy + s * Math.sin(a)).toFixed(2)}`);
	}
	return `<polygon points="${pts.join(" ")}" fill="${fill}"/>`;
};

interface CellRenderContext {
	x: number;
	y: number;
	size: number;
	radius: number;
	fill: string;
	level: number;
}

const CELL_RENDERERS: Record<ShapeKind, (context: CellRenderContext) => string> = {
	dot: ({ x, y, size, fill, level }) => renderCircle(x + size / 2, y + size / 2, level === 0 ? 1.4 : 1.4 + level, fill),
	hex: ({ x, y, size, fill }) => renderHex(x + size / 2, y + size / 2, size / 2, fill),
	circle: ({ x, y, size, fill }) => renderCircle(x + size / 2, y + size / 2, size / 2, fill),
	rounded: ({ x, y, size, radius, fill }) => renderRect(x, y, size, radius, fill),
	square: ({ x, y, size, radius, fill }) => renderRect(x, y, size, radius, fill),
};

export const svgStringRenderer: SvgRenderer = ({ calendar, options }: SvgRendererParams): string => {
	const { palette, shape, background } = options;
	const size = options.cellSize ?? DEFAULT_CELL_SIZE;
	const gap = options.cellGap ?? DEFAULT_CELL_GAP;
	const showLabels = options.showLabels ?? true;
	const cellWidth = size + gap;
	const labelWidth = showLabels ? LABEL_W : 0;
	const labelHeight = showLabels ? LABEL_H : 0;
	const totalWidth = WEEKS * cellWidth + labelWidth + PAD_X * 2;
	const totalHeight = DAYS_PER_WEEK * cellWidth + labelHeight + PAD_Y * 2;
	const radius = RADIUS_BY_SHAPE[shape] ?? size / 2;

	const weeks = Array.from({ length: WEEKS }, (_, i) =>
		calendar.days.slice(i * DAYS_PER_WEEK, i * DAYS_PER_WEEK + DAYS_PER_WEEK),
	);

	const parts: string[] = [];
	parts.push(
		`<svg viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GitHub contribution calendar">`,
	);

	if (background !== "transparent") {
		parts.push(`<rect width="${totalWidth}" height="${totalHeight}" fill="${background}"/>`);
	}

	if (showLabels) {
		let lastMonth = -1;
		for (const [weekIndex, week] of weeks.entries()) {
			const first = week[0];
			if (!first) continue;
			const date = new Date(`${first.date}T12:00:00`);
			const month = date.getMonth();
			if (month !== lastMonth && date.getDate() <= MONTH_LABEL_MAX_DAY) {
				parts.push(
					`<text x="${PAD_X + labelWidth + weekIndex * cellWidth}" y="${PAD_Y + MONTH_LABEL_BASELINE_OFFSET}" fill="${MONTH_LABEL_FILL}" font-size="${MONTH_LABEL_FONT_SIZE}" font-family="${LABEL_FONT_FAMILY}" letter-spacing="${MONTH_LABEL_LETTER_SPACING}">${MONTHS[month]}</text>`,
				);
				lastMonth = month;
			}
		}

		for (const [i, dayLabel] of DOW.entries()) {
			parts.push(
				`<text x="${PAD_X}" y="${PAD_Y + labelHeight + (i * 2 + 1) * cellWidth + DOW_LABEL_BASELINE_OFFSET}" fill="${DOW_LABEL_FILL}" font-size="${DOW_LABEL_FONT_SIZE}" font-family="${LABEL_FONT_FAMILY}">${dayLabel}</text>`,
			);
		}
	}

	parts.push(`<g transform="translate(${PAD_X + labelWidth},${PAD_Y + labelHeight})">`);

	for (const [weekIndex, week] of weeks.entries()) {
		for (const [dayIndex, day] of week.entries()) {
			const fill = palette.colors[day.level];
			const x = weekIndex * cellWidth;
			const y = dayIndex * cellWidth;
			parts.push(CELL_RENDERERS[shape]({ x, y, size, radius, fill, level: day.level }));
		}
	}

	parts.push("</g></svg>");
	return parts.join("");
};
