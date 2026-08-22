import { renderCellShape } from "@domain/services/cell-shapes";
import {
	CALENDAR_ARIA_LABEL,
	calendarLayout,
	SVG_MONTH_LABEL_FONT_SIZE,
	SVG_MONTH_LABEL_LETTER_SPACING,
	SVG_WEEKDAY_LABEL_FONT_SIZE,
} from "@domain/services/svg-geometry";
import type { SvgRenderer } from "@domain/services/types";
import { DEFAULT_BACKGROUND_COLOR } from "@domain/value-objects/palette";

const LABEL_FONT_FAMILY = "ui-monospace,monospace";
const MONTH_LABEL_FILL = "rgba(255,255,255,0.45)";
const WEEKDAY_LABEL_FILL = "rgba(255,255,255,0.35)";

export const svgStringRenderer: SvgRenderer = ({ calendar, options }) => {
	const { palette, shape, background } = options;
	const layout = calendarLayout({
		days: calendar.days,
		shape,
		size: options.cellSize,
		gap: options.cellGap,
		showLabels: options.showLabels,
	});

	const parts: string[] = [];
	parts.push(
		`<svg viewBox="0 0 ${layout.width} ${layout.height}" width="${layout.width}" height="${layout.height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${CALENDAR_ARIA_LABEL}">`,
	);

	if (background !== DEFAULT_BACKGROUND_COLOR) {
		parts.push(`<rect width="${layout.width}" height="${layout.height}" fill="${background}"/>`);
	}

	for (const { x, y, label } of layout.monthLabels) {
		parts.push(
			`<text x="${x}" y="${y}" fill="${MONTH_LABEL_FILL}" font-size="${SVG_MONTH_LABEL_FONT_SIZE}" font-family="${LABEL_FONT_FAMILY}" letter-spacing="${SVG_MONTH_LABEL_LETTER_SPACING}">${label}</text>`,
		);
	}

	for (const { x, y, label } of layout.weekdayLabels) {
		parts.push(
			`<text x="${x}" y="${y}" fill="${WEEKDAY_LABEL_FILL}" font-size="${SVG_WEEKDAY_LABEL_FONT_SIZE}" font-family="${LABEL_FONT_FAMILY}">${label}</text>`,
		);
	}

	parts.push(`<g transform="translate(${layout.origin.x},${layout.origin.y})">`);

	for (const { x, y, level } of layout.cells) {
		parts.push(
			renderCellShape({ shape, x, y, size: layout.size, radius: layout.radius, fill: palette.colors[level], level }),
		);
	}

	parts.push("</g></svg>");
	return parts.join("");
};
