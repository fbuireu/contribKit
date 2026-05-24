import type { ContributionCalendar } from "../../domain/entities/contribution-calendar";
import type { ContributionDay } from "../../domain/entities/contribution-day";
import type { SvgRenderer, SvgRenderOptions } from "../../domain/services/svg-renderer";
import { DOW, MONTHS } from "../../domain/value-objects/calendar-labels";

const PAD_X = 12;
const PAD_Y = 12;
const LABEL_W = 28;
const LABEL_H = 18;
const DEFAULT_CELL_SIZE = 10;
const DEFAULT_CELL_GAP = 2;
const WEEKS = 53;
const DAYS_PER_WEEK = 7;

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

export const svgStringRenderer: SvgRenderer = (calendar: ContributionCalendar, options: SvgRenderOptions): string => {
	const { palette, shape, background } = options;
	const size = options.cellSize ?? DEFAULT_CELL_SIZE;
	const gap = options.cellGap ?? DEFAULT_CELL_GAP;
	const showLabels = options.showLabels ?? true;
	const cellWidth = size + gap;
	const labelWidth = showLabels ? LABEL_W : 0;
	const labelHeight = showLabels ? LABEL_H : 0;
	const totalWidth = WEEKS * cellWidth + labelWidth + PAD_X * 2;
	const totalHeight = DAYS_PER_WEEK * cellWidth + labelHeight + PAD_Y * 2;
	const radius = shape === "rounded" ? 2.5 : shape === "square" ? 0 : size / 2;

	const weeks: ContributionDay[][] = [];
	for (let weekIndex = 0; weekIndex < WEEKS; weekIndex++) {
		weeks.push([...calendar.days.slice(weekIndex * DAYS_PER_WEEK, weekIndex * DAYS_PER_WEEK + DAYS_PER_WEEK)]);
	}

	const parts: string[] = [];
	parts.push(
		`<svg viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GitHub contribution calendar">`,
	);

	if (background !== "transparent") {
		parts.push(`<rect width="${totalWidth}" height="${totalHeight}" fill="${background}"/>`);
	}

	if (showLabels) {
		let lastMonth = -1;
		weeks.forEach((week, weekIndex) => {
			const first = week[0];
			if (!first) return;
			const date = new Date(`${first.date}T12:00:00`);
			const month = date.getMonth();
			if (month !== lastMonth && date.getDate() <= 7) {
				parts.push(
					`<text x="${PAD_X + labelWidth + weekIndex * cellWidth}" y="${PAD_Y + 11}" fill="rgba(255,255,255,0.45)" font-size="9.5" font-family="ui-monospace,monospace" letter-spacing="0.04em">${MONTHS[month]}</text>`,
				);
				lastMonth = month;
			}
		});

		DOW.forEach((dayLabel, i) => {
			parts.push(
				`<text x="${PAD_X}" y="${PAD_Y + labelHeight + (i * 2 + 1) * cellWidth + 4}" fill="rgba(255,255,255,0.35)" font-size="9" font-family="ui-monospace,monospace">${dayLabel}</text>`,
			);
		});
	}

	parts.push(`<g transform="translate(${PAD_X + labelWidth},${PAD_Y + labelHeight})">`);

	weeks.forEach((week, weekIndex) => {
		week.forEach((day, dayIndex) => {
			const fill = palette.colors[day.level];
			const x = weekIndex * cellWidth;
			const y = dayIndex * cellWidth;
			if (shape === "dot") {
				const dotRadius = day.level === 0 ? 1.4 : 1.4 + day.level * 1.0;
				parts.push(renderCircle(x + size / 2, y + size / 2, dotRadius, fill));
			} else if (shape === "hex") {
				parts.push(renderHex(x + size / 2, y + size / 2, size / 2, fill));
			} else if (shape === "circle") {
				parts.push(renderCircle(x + size / 2, y + size / 2, size / 2, fill));
			} else {
				parts.push(renderRect(x, y, size, radius, fill));
			}
		});
	});

	parts.push("</g></svg>");
	return parts.join("");
};
