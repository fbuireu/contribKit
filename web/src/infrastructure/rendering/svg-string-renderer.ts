import {
	calendarDimensions,
	dotRadius,
	hexPoints,
	radiusFor,
	SVG_DAYS_PER_WEEK,
	SVG_DEFAULT_CELL_GAP,
	SVG_DEFAULT_CELL_SIZE,
	SVG_DOW_LABEL_BASELINE,
	SVG_MONTH_LABEL_BASELINE,
	SVG_MONTH_LABEL_MAX_DAY,
	SVG_PAD_X,
	SVG_PAD_Y,
	SVG_WEEKS,
} from "@domain/services/svg-geometry";
import type { SvgRenderer, SvgRendererParams } from "@domain/services/svg-renderer";
import { DOW, MONTHS } from "@domain/value-objects/calendar-labels";
import type { ShapeKind } from "@domain/value-objects/shape";

const LABEL_FONT_FAMILY = "ui-monospace,monospace";
const MONTH_LABEL_FILL = "rgba(255,255,255,0.45)";
const MONTH_LABEL_FONT_SIZE = "9.5";
const MONTH_LABEL_LETTER_SPACING = "0.04em";
const DOW_LABEL_FILL = "rgba(255,255,255,0.35)";
const DOW_LABEL_FONT_SIZE = "9";

const renderRect = (x: number, y: number, size: number, radius: number, fill: string): string =>
	`<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="${fill}"/>`;

const renderCircle = (cx: number, cy: number, r: number, fill: string): string =>
	`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;

interface CellRenderContext {
	x: number;
	y: number;
	size: number;
	radius: number;
	fill: string;
	level: number;
}

const CELL_RENDERERS: Record<ShapeKind, (context: CellRenderContext) => string> = {
	dot: ({ x, y, size, fill, level }) => renderCircle(x + size / 2, y + size / 2, dotRadius(level), fill),
	hex: ({ x, y, size, fill }) =>
		`<polygon points="${hexPoints({ cx: x + size / 2, cy: y + size / 2, radius: size / 2 })}" fill="${fill}"/>`,
	circle: ({ x, y, size, fill }) => renderCircle(x + size / 2, y + size / 2, size / 2, fill),
	rounded: ({ x, y, size, radius, fill }) => renderRect(x, y, size, radius, fill),
	square: ({ x, y, size, radius, fill }) => renderRect(x, y, size, radius, fill),
};

export const svgStringRenderer: SvgRenderer = ({ calendar, options }: SvgRendererParams): string => {
	const { palette, shape, background } = options;
	const size = options.cellSize ?? SVG_DEFAULT_CELL_SIZE;
	const gap = options.cellGap ?? SVG_DEFAULT_CELL_GAP;
	const showLabels = options.showLabels ?? true;
	const { cellWidth, labelWidth, labelHeight, totalWidth, totalHeight } = calendarDimensions({ size, gap, showLabels });
	const radius = radiusFor({ shape, size });

	const weeks = Array.from({ length: SVG_WEEKS }, (_, i) =>
		calendar.days.slice(i * SVG_DAYS_PER_WEEK, i * SVG_DAYS_PER_WEEK + SVG_DAYS_PER_WEEK),
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
			if (month !== lastMonth && date.getDate() <= SVG_MONTH_LABEL_MAX_DAY) {
				parts.push(
					`<text x="${SVG_PAD_X + labelWidth + weekIndex * cellWidth}" y="${SVG_PAD_Y + SVG_MONTH_LABEL_BASELINE}" fill="${MONTH_LABEL_FILL}" font-size="${MONTH_LABEL_FONT_SIZE}" font-family="${LABEL_FONT_FAMILY}" letter-spacing="${MONTH_LABEL_LETTER_SPACING}">${MONTHS[month]}</text>`,
				);
				lastMonth = month;
			}
		}

		for (const [i, dayLabel] of DOW.entries()) {
			parts.push(
				`<text x="${SVG_PAD_X}" y="${SVG_PAD_Y + labelHeight + (i * 2 + 1) * cellWidth + SVG_DOW_LABEL_BASELINE}" fill="${DOW_LABEL_FILL}" font-size="${DOW_LABEL_FONT_SIZE}" font-family="${LABEL_FONT_FAMILY}">${dayLabel}</text>`,
			);
		}
	}

	parts.push(`<g transform="translate(${SVG_PAD_X + labelWidth},${SVG_PAD_Y + labelHeight})">`);

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
