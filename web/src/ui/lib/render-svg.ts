import {
	calendarDimensions,
	dotRadius,
	hexPoints,
	radiusFor,
	SVG_DAYS_PER_WEEK,
	SVG_DOW_LABEL_BASELINE,
	SVG_MONTH_LABEL_BASELINE,
	SVG_MONTH_LABEL_MAX_DAY,
	SVG_PAD_X,
	SVG_PAD_Y,
	SVG_WEEKS,
} from "@domain/services/svg-geometry";
import { DEFAULT_SHAPE_KIND } from "@domain/value-objects/shape";
import { type Cell, DOW, MONTHS, type RenderCalendarParams } from "./calendar-utils";
import { TOTALS_PER_LEVEL } from "./contribution";

export function renderCalendarString({
	cells,
	palette,
	shape = DEFAULT_SHAPE_KIND,
	size = 10,
	gap = 2,
	showLabels = true,
}: RenderCalendarParams): string {
	const weeks: Cell[][] = [];
	for (let weekIndex = 0; weekIndex < SVG_WEEKS; weekIndex++)
		weeks.push(cells.slice(weekIndex * SVG_DAYS_PER_WEEK, weekIndex * SVG_DAYS_PER_WEEK + SVG_DAYS_PER_WEEK));

	const monthLabels: { weekIndex: number; label: string }[] = [];
	let lastMonth = -1;
	weeks.forEach((week, weekIndex) => {
		if (!week[0]) return;
		const month = parseInt(week[0].date.slice(5, 7), 10) - 1;
		if (month !== lastMonth && parseInt(week[0].date.slice(8, 10), 10) <= SVG_MONTH_LABEL_MAX_DAY) {
			monthLabels.push({ weekIndex, label: MONTHS[month] });
			lastMonth = month;
		}
	});

	const { cellWidth, labelWidth, labelHeight, totalWidth, totalHeight } = calendarDimensions({ size, gap, showLabels });
	const radius = radiusFor(shape, size);

	const parts: string[] = [];
	parts.push(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" style="display:block;overflow:visible" role="img" aria-label="GitHub contribution calendar">`,
	);
	if (showLabels) {
		monthLabels.forEach(({ weekIndex, label }) => {
			parts.push(
				`<text x="${SVG_PAD_X + labelWidth + weekIndex * cellWidth}" y="${SVG_PAD_Y + SVG_MONTH_LABEL_BASELINE}" style="fill:var(--text-dim);opacity:.85" font-size="9.5" font-family="ui-monospace,'JetBrains Mono',monospace" letter-spacing="0.04em">${label}</text>`,
			);
		});
		DOW.forEach((dayLabel, i) => {
			parts.push(
				`<text x="${SVG_PAD_X}" y="${SVG_PAD_Y + labelHeight + (i * 2 + 1) * cellWidth + SVG_DOW_LABEL_BASELINE}" style="fill:var(--text-dimmer)" font-size="9" font-family="ui-monospace,'JetBrains Mono',monospace">${dayLabel}</text>`,
			);
		});
	}
	parts.push(`<g transform="translate(${SVG_PAD_X + labelWidth},${SVG_PAD_Y + labelHeight})">`);
	weeks.forEach((week, weekIndex) => {
		week.forEach((cell, dayIndex) => {
			const level = Math.min(4, cell.level);
			const fill = palette[level] || palette[0];
			const x = weekIndex * cellWidth;
			const y = dayIndex * cellWidth;
			const count = cell.count ?? TOTALS_PER_LEVEL[level];
			const data = ` data-date="${cell.date}" data-count="${count}"`;
			if (shape === "dot") {
				parts.push(`<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${dotRadius(level)}" fill="${fill}"${data}/>`);
			} else if (shape === "hex") {
				const points = hexPoints({ cx: x + size / 2, cy: y + size / 2, radius: size / 2 });
				parts.push(`<polygon points="${points}" fill="${fill}"${data}/>`);
			} else {
				parts.push(`<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="${fill}"${data}/>`);
			}
		});
	});
	parts.push("</g></svg>");
	return parts.join("");
}

export function shapePreviewSVG(kind: string): string {
	const fill = "#39D353";
	if (kind === "dot")
		return `<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="3.2" fill="${fill}"/></svg>`;
	if (kind === "circle")
		return `<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="6.5" fill="${fill}"/></svg>`;
	if (kind === "hex") {
		const points = hexPoints({ cx: 10, cy: 10, radius: 7 });
		return `<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><polygon points="${points}" fill="${fill}"/></svg>`;
	}
	const borderRadius = kind === "rounded" ? 2.5 : 0;
	return `<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="${borderRadius}" fill="${fill}"/></svg>`;
}
