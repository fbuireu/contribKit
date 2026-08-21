import type { ContributionDay } from "@domain/entities/types";
import { renderCellShape } from "@domain/services/cell-shapes";
import {
	CALENDAR_ARIA_LABEL,
	calendarLayout,
	hexPoints,
	SVG_MONTH_LABEL_FONT_SIZE,
	SVG_MONTH_LABEL_LETTER_SPACING,
	SVG_WEEKDAY_LABEL_FONT_SIZE,
} from "@domain/services/svg-geometry";
import { CellShape, DEFAULT_CELL_SHAPE, isCellShape } from "@domain/value-objects/cell-shape";
import type { PaletteColors } from "@domain/value-objects/palette";

export interface RenderCalendarParams {
	days: ContributionDay[];
	palette: PaletteColors;
	shape?: CellShape;
	size?: number;
	gap?: number;
	showLabels?: boolean;
}

export function renderCalendarString({
	days,
	palette,
	shape = DEFAULT_CELL_SHAPE,
	size,
	gap,
	showLabels,
}: RenderCalendarParams): string {
	const layout = calendarLayout({ days, shape, size, gap, showLabels });

	const parts: string[] = [];
	parts.push(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width} ${layout.height}" width="100%" style="display:block;overflow:visible" role="img" aria-label="${CALENDAR_ARIA_LABEL}">`,
	);

	for (const { x, y, label } of layout.monthLabels) {
		parts.push(
			`<text x="${x}" y="${y}" style="fill:var(--text-dim);opacity:.85;font-family:var(--font-mono)" font-size="${SVG_MONTH_LABEL_FONT_SIZE}" letter-spacing="${SVG_MONTH_LABEL_LETTER_SPACING}">${label}</text>`,
		);
	}

	for (const { x, y, label } of layout.weekdayLabels) {
		parts.push(
			`<text x="${x}" y="${y}" style="fill:var(--text-dimmer);font-family:var(--font-mono)" font-size="${SVG_WEEKDAY_LABEL_FONT_SIZE}">${label}</text>`,
		);
	}

	parts.push(`<g transform="translate(${layout.origin.x},${layout.origin.y})">`);

	for (const { x, y, date, level, count } of layout.cells) {
		const attributes = count === null ? ` data-date="${date}"` : ` data-date="${date}" data-count="${count}"`;
		parts.push(
			renderCellShape({
				shape,
				x,
				y,
				size: layout.size,
				radius: layout.radius,
				fill: palette[level],
				level,
				attributes,
			}),
		);
	}

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
	return wrapPreviewSvg(SHAPE_PREVIEWS[resolvedShape]("var(--contrib-peak)"));
}
