import { renderCellShape } from "@domain/services/cell-shapes";
import { chunkWeeks } from "@domain/services/dates";
import {
	calendarDimensions,
	hexPoints,
	monthLabelPositions,
	radiusFor,
	SVG_DEFAULT_CELL_GAP,
	SVG_DEFAULT_CELL_SIZE,
	SVG_MONTH_LABEL_BASELINE,
	SVG_MONTH_LABEL_FONT_SIZE,
	SVG_MONTH_LABEL_LETTER_SPACING,
	SVG_PAD_X,
	SVG_PAD_Y,
	SVG_WEEKDAY_LABEL_BASELINE,
	SVG_WEEKDAY_LABEL_FONT_SIZE,
} from "@domain/services/svg-geometry";
import { WEEKDAY_LABELS } from "@domain/value-objects/calendar-labels";
import { CellShape, DEFAULT_CELL_SHAPE, isCellShape } from "@domain/value-objects/cell-shape";
import { clampLevel } from "@domain/value-objects/contribution-level";
import { cssVar } from "@ui/utils/css";
import type { RenderCalendarParams } from "./calendar";

export function renderCalendarString({
	days,
	palette,
	shape = DEFAULT_CELL_SHAPE,
	size = SVG_DEFAULT_CELL_SIZE,
	gap = SVG_DEFAULT_CELL_GAP,
	showLabels = true,
}: RenderCalendarParams): string {
	const resolvedShape = isCellShape(shape) ? shape : DEFAULT_CELL_SHAPE;
	const weeks = chunkWeeks(days);
	const monthLabels = monthLabelPositions(weeks);

	const { cellWidth, labelWidth, labelHeight, totalWidth, totalHeight } = calendarDimensions({ size, gap, showLabels });
	const radius = radiusFor({ shape: resolvedShape, size });

	const parts: string[] = [];
	parts.push(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" style="display:block;overflow:visible" role="img" aria-label="GitHub contribution calendar">`,
	);
	if (showLabels) {
		monthLabels.forEach(({ weekIndex, label }) => {
			parts.push(
				`<text x="${SVG_PAD_X + labelWidth + weekIndex * cellWidth}" y="${SVG_PAD_Y + SVG_MONTH_LABEL_BASELINE}" style="fill:var(--text-dim);opacity:.85;font-family:var(--font-mono)" font-size="${SVG_MONTH_LABEL_FONT_SIZE}" letter-spacing="${SVG_MONTH_LABEL_LETTER_SPACING}">${label}</text>`,
			);
		});
		WEEKDAY_LABELS.forEach((dayLabel, index) => {
			parts.push(
				`<text x="${SVG_PAD_X}" y="${SVG_PAD_Y + labelHeight + (index * 2 + 1) * cellWidth + SVG_WEEKDAY_LABEL_BASELINE}" style="fill:var(--text-dimmer);font-family:var(--font-mono)" font-size="${SVG_WEEKDAY_LABEL_FONT_SIZE}">${dayLabel}</text>`,
			);
		});
	}
	parts.push(`<g transform="translate(${SVG_PAD_X + labelWidth},${SVG_PAD_Y + labelHeight})">`);
	weeks.forEach((week, weekIndex) => {
		week.forEach((cell, dayIndex) => {
			const level = clampLevel(cell.level);
			const fill = palette[level] || palette[0];
			const x = weekIndex * cellWidth;
			const y = dayIndex * cellWidth;
			const attributes =
				cell.count === null ? ` data-date="${cell.date}"` : ` data-date="${cell.date}" data-count="${cell.count}"`;
			parts.push(renderCellShape({ shape: resolvedShape, x, y, size, radius, fill, level, attributes }));
		});
	});
	parts.push("</g></svg>");
	return parts.join("");
}

const wrapPreviewSvg = (content: string): string =>
	`<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">${content}</svg>`;

const SHAPE_PREVIEWS: Record<CellShape, (fill: string) => string> = {
	[CellShape.Dot]: (fill) => `<circle cx="10" cy="10" r="3.2" style="fill:${fill}"/>`,
	[CellShape.Circle]: (fill) => `<circle cx="10" cy="10" r="6.5" style="fill:${fill}"/>`,
	[CellShape.Hex]: (fill) => `<polygon points="${hexPoints({ cx: 10, cy: 10, radius: 7 })}" style="fill:${fill}"/>`,
	[CellShape.Rounded]: (fill) => `<rect x="3" y="3" width="14" height="14" rx="2.5" style="fill:${fill}"/>`,
	[CellShape.Square]: (fill) => `<rect x="3" y="3" width="14" height="14" rx="0" style="fill:${fill}"/>`,
};

export function shapePreviewSVG(kind: string): string {
	const resolvedShape = isCellShape(kind) ? kind : DEFAULT_CELL_SHAPE;
	return wrapPreviewSvg(SHAPE_PREVIEWS[resolvedShape](cssVar("--contrib-peak")));
}
