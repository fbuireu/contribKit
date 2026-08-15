import { renderCellShape } from "@domain/services/cell-shapes";
import { chunkWeeks } from "@domain/services/dates";
import {
	CALENDAR_ARIA_LABEL,
	calendarDimensions,
	cellPoint,
	gridOrigin,
	monthLabelPoint,
	monthLabelPositions,
	radiusFor,
	SVG_DEFAULT_CELL_GAP,
	SVG_DEFAULT_CELL_SIZE,
	SVG_MONTH_LABEL_FONT_SIZE,
	SVG_MONTH_LABEL_LETTER_SPACING,
	SVG_WEEKDAY_LABEL_FONT_SIZE,
	weekdayLabelPoint,
} from "@domain/services/svg-geometry";
import type { SvgRenderer, SvgRendererParams } from "@domain/services/types";
import { WEEKDAY_LABELS } from "@domain/value-objects/calendar-labels";
import { DEFAULT_BACKGROUND_COLOR } from "@domain/value-objects/palette";

const LABEL_FONT_FAMILY = "ui-monospace,monospace";
const MONTH_LABEL_FILL = "rgba(255,255,255,0.45)";
const WEEKDAY_LABEL_FILL = "rgba(255,255,255,0.35)";

export const svgStringRenderer: SvgRenderer = ({ calendar, options }: SvgRendererParams): string => {
	const { palette, shape, background } = options;
	const size = options.cellSize ?? SVG_DEFAULT_CELL_SIZE;
	const gap = options.cellGap ?? SVG_DEFAULT_CELL_GAP;
	const showLabels = options.showLabels ?? true;
	const { cellWidth, labelWidth, labelHeight, totalWidth, totalHeight } = calendarDimensions({ size, gap, showLabels });
	const radius = radiusFor({ shape, size });

	const weeks = chunkWeeks(calendar.days);

	const parts: string[] = [];
	parts.push(
		`<svg viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${CALENDAR_ARIA_LABEL}">`,
	);

	if (background !== DEFAULT_BACKGROUND_COLOR) {
		parts.push(`<rect width="${totalWidth}" height="${totalHeight}" fill="${background}"/>`);
	}

	if (showLabels) {
		for (const { weekIndex, label } of monthLabelPositions(weeks)) {
			const { x, y } = monthLabelPoint({ weekIndex, cellWidth, labelWidth });
			parts.push(
				`<text x="${x}" y="${y}" fill="${MONTH_LABEL_FILL}" font-size="${SVG_MONTH_LABEL_FONT_SIZE}" font-family="${LABEL_FONT_FAMILY}" letter-spacing="${SVG_MONTH_LABEL_LETTER_SPACING}">${label}</text>`,
			);
		}

		for (const [index, dayLabel] of WEEKDAY_LABELS.entries()) {
			const { x, y } = weekdayLabelPoint({ index, cellWidth, labelHeight });
			parts.push(
				`<text x="${x}" y="${y}" fill="${WEEKDAY_LABEL_FILL}" font-size="${SVG_WEEKDAY_LABEL_FONT_SIZE}" font-family="${LABEL_FONT_FAMILY}">${dayLabel}</text>`,
			);
		}
	}

	const origin = gridOrigin({ labelWidth, labelHeight });
	parts.push(`<g transform="translate(${origin.x},${origin.y})">`);

	for (const [weekIndex, week] of weeks.entries()) {
		for (const [dayIndex, day] of week.entries()) {
			const fill = palette.colors[day.level];
			const { x, y } = cellPoint({ weekIndex, dayIndex, cellWidth });
			parts.push(renderCellShape({ shape, x, y, size, radius, fill, level: day.level }));
		}
	}

	parts.push("</g></svg>");
	return parts.join("");
};
