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
	for (let weekIndex = 0; weekIndex < 53; weekIndex++) weeks.push(cells.slice(weekIndex * 7, weekIndex * 7 + 7));

	const monthLabels: { weekIndex: number; label: string }[] = [];
	let lastMonth = -1;
	weeks.forEach((week, weekIndex) => {
		if (!week[0]) return;
		const month = parseInt(week[0].date.slice(5, 7), 10) - 1;
		if (month !== lastMonth && parseInt(week[0].date.slice(8, 10), 10) <= 7) {
			monthLabels.push({ weekIndex, label: MONTHS[month] });
			lastMonth = month;
		}
	});

	const cellWidth = size + gap;
	const labelWidth = showLabels ? 28 : 0;
	const labelHeight = showLabels ? 18 : 0;
	const paddingX = 12,
		paddingY = 12;
	const totalWidth = 53 * cellWidth + labelWidth + paddingX * 2;
	const totalHeight = 7 * cellWidth + labelHeight + paddingY * 2;
	const radius = shape === "rounded" ? 2.5 : shape === "square" ? 0 : size / 2;

	const parts: string[] = [];
	parts.push(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" style="display:block;overflow:visible" role="img" aria-label="GitHub contribution calendar">`,
	);
	if (showLabels) {
		monthLabels.forEach(({ weekIndex, label }) => {
			parts.push(
				`<text x="${paddingX + labelWidth + weekIndex * cellWidth}" y="${paddingY + 11}" style="fill:var(--text-dim);opacity:.85" font-size="9.5" font-family="ui-monospace,'JetBrains Mono',monospace" letter-spacing="0.04em">${label}</text>`,
			);
		});
		DOW.forEach((dayLabel, i) => {
			parts.push(
				`<text x="${paddingX}" y="${paddingY + labelHeight + (i * 2 + 1) * cellWidth + 4}" style="fill:var(--text-dimmer)" font-size="9" font-family="ui-monospace,'JetBrains Mono',monospace">${dayLabel}</text>`,
			);
		});
	}
	parts.push(`<g transform="translate(${paddingX + labelWidth},${paddingY + labelHeight})">`);
	weeks.forEach((week, weekIndex) => {
		week.forEach((cell, dayIndex) => {
			const level = Math.min(4, cell.level);
			const fill = palette[level] || palette[0];
			const x = weekIndex * cellWidth,
				y = dayIndex * cellWidth;
			const count = cell.count ?? TOTALS_PER_LEVEL[level];
			const data = ` data-date="${cell.date}" data-count="${count}"`;
			if (shape === "dot") {
				const dotRadius = level === 0 ? 1.4 : 1.4 + level * 1.0;
				parts.push(`<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${dotRadius}" fill="${fill}"${data}/>`);
			} else if (shape === "hex") {
				const halfSize = size / 2,
					centerX = x + halfSize,
					centerY = y + halfSize;
				const pts: string[] = [];
				for (let i = 0; i < 6; i++) {
					const a = (Math.PI / 3) * i + Math.PI / 6;
					pts.push(`${(centerX + halfSize * Math.cos(a)).toFixed(2)},${(centerY + halfSize * Math.sin(a)).toFixed(2)}`);
				}
				parts.push(`<polygon points="${pts.join(" ")}" fill="${fill}"${data}/>`);
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
		return `<svg viewBox="0 0 20 20" width="20" height="20"><circle cx="10" cy="10" r="3.2" fill="${fill}"/></svg>`;
	if (kind === "circle")
		return `<svg viewBox="0 0 20 20" width="20" height="20"><circle cx="10" cy="10" r="6.5" fill="${fill}"/></svg>`;
	if (kind === "hex") {
		const hexSize = 7;
		const pts: string[] = [];
		for (let i = 0; i < 6; i++) {
			const a = (Math.PI / 3) * i + Math.PI / 6;
			pts.push(`${(10 + hexSize * Math.cos(a)).toFixed(2)},${(10 + hexSize * Math.sin(a)).toFixed(2)}`);
		}
		return `<svg viewBox="0 0 20 20" width="20" height="20"><polygon points="${pts.join(" ")}" fill="${fill}"/></svg>`;
	}
	const borderRadius = kind === "rounded" ? 2.5 : 0;
	return `<svg viewBox="0 0 20 20" width="20" height="20"><rect x="3" y="3" width="14" height="14" rx="${borderRadius}" fill="${fill}"/></svg>`;
}
