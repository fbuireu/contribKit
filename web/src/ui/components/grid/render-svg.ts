import { renderCellShape } from "@domain/services/cell-shapes";
import {
	calendarDimensions,
	chunkWeeks,
	hexPoints,
	monthLabelPositions,
	radiusFor,
	SVG_DEFAULT_CELL_GAP,
	SVG_DEFAULT_CELL_SIZE,
	SVG_DOW_LABEL_BASELINE,
	SVG_DOW_LABEL_FONT_SIZE,
	SVG_MONTH_LABEL_BASELINE,
	SVG_MONTH_LABEL_FONT_SIZE,
	SVG_MONTH_LABEL_LETTER_SPACING,
	SVG_PAD_X,
	SVG_PAD_Y,
} from "@domain/services/svg-geometry";
import { DOW } from "@domain/value-objects/calendar-labels";
import { clampLevel } from "@domain/value-objects/contribution-level";
import { DEFAULT_SHAPE_KIND, isShapeKind, ShapeKind } from "@domain/value-objects/shape";
import { cssVar } from "@ui/utils/css";
import type { RenderCalendarParams } from "./calendar";
import { TOTALS_PER_LEVEL } from "./contribution";

export function renderCalendarString({
	cells,
	palette,
	shape = DEFAULT_SHAPE_KIND,
	size = SVG_DEFAULT_CELL_SIZE,
	gap = SVG_DEFAULT_CELL_GAP,
	showLabels = true,
}: RenderCalendarParams): string {
	const shapeKind = isShapeKind(shape) ? shape : DEFAULT_SHAPE_KIND;
	const weeks = chunkWeeks(cells);
	const monthLabels = monthLabelPositions(weeks);

	const { cellWidth, labelWidth, labelHeight, totalWidth, totalHeight } = calendarDimensions({ size, gap, showLabels });
	const radius = radiusFor({ shape: shapeKind, size });

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
		DOW.forEach((dayLabel, index) => {
			parts.push(
				`<text x="${SVG_PAD_X}" y="${SVG_PAD_Y + labelHeight + (index * 2 + 1) * cellWidth + SVG_DOW_LABEL_BASELINE}" style="fill:var(--text-dimmer);font-family:var(--font-mono)" font-size="${SVG_DOW_LABEL_FONT_SIZE}">${dayLabel}</text>`,
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
			const count = cell.count ?? TOTALS_PER_LEVEL[level];
			const attributes = ` data-date="${cell.date}" data-count="${count}"`;
			parts.push(renderCellShape({ shape: shapeKind, x, y, size, radius, fill, level, attributes }));
		});
	});
	parts.push("</g></svg>");
	return parts.join("");
}

const wrapPreviewSvg = (content: string): string =>
	`<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">${content}</svg>`;

const SHAPE_PREVIEWS: Record<ShapeKind, (fill: string) => string> = {
	[ShapeKind.Dot]: (fill) => `<circle cx="10" cy="10" r="3.2" style="fill:${fill}"/>`,
	[ShapeKind.Circle]: (fill) => `<circle cx="10" cy="10" r="6.5" style="fill:${fill}"/>`,
	[ShapeKind.Hex]: (fill) => `<polygon points="${hexPoints({ cx: 10, cy: 10, radius: 7 })}" style="fill:${fill}"/>`,
	[ShapeKind.Rounded]: (fill) => `<rect x="3" y="3" width="14" height="14" rx="2.5" style="fill:${fill}"/>`,
	[ShapeKind.Square]: (fill) => `<rect x="3" y="3" width="14" height="14" rx="0" style="fill:${fill}"/>`,
};

export function shapePreviewSVG(kind: string): string {
	const shapeKind = isShapeKind(kind) ? kind : DEFAULT_SHAPE_KIND;
	return wrapPreviewSvg(SHAPE_PREVIEWS[shapeKind](cssVar("--contrib-peak")));
}
