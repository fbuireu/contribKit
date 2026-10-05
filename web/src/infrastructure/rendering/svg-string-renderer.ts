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
const MONTH_LABEL_CLASS = "month";
const WEEKDAY_LABEL_CLASS = "weekday";
const MONTH_LABEL_FILL = "rgba(255,255,255,0.45)";
const WEEKDAY_LABEL_FILL = "rgba(255,255,255,0.35)";
const MONTH_LABEL_FILL_ON_LIGHT = "rgba(0,0,0,0.55)";
const WEEKDAY_LABEL_FILL_ON_LIGHT = "rgba(0,0,0,0.45)";
const MONTH_LABEL_ALPHA_ON_DARK = 0.45;
const WEEKDAY_LABEL_ALPHA_ON_DARK = 0.35;
const LABEL_ALPHA_STEP_ON_LIGHT = 0.1;
const CONTRASTING_CHANNEL = "calc(255 * clamp(0,(128 - r) * 1000,1))";
const IS_LIGHT = "clamp(0,(r - 128) * 1000,1)";

interface LabelFillAgainstParams {
	background: string;
	alphaOnDark: number;
}

const labelFillAgainst = ({ background, alphaOnDark }: LabelFillAgainstParams): string => {
	const channels = `${CONTRASTING_CHANNEL} ${CONTRASTING_CHANNEL} ${CONTRASTING_CHANNEL}`;
	const alpha = `calc(${alphaOnDark} + ${LABEL_ALPHA_STEP_ON_LIGHT} * ${IS_LIGHT})`;
	return `rgb(from lch(from ${background} l 0 0) ${channels} / ${alpha})`;
};

const LIGHT_SCHEME_LABEL_STYLE = `@media (prefers-color-scheme:light){.${MONTH_LABEL_CLASS}{fill:${MONTH_LABEL_FILL_ON_LIGHT}}.${WEEKDAY_LABEL_CLASS}{fill:${WEEKDAY_LABEL_FILL_ON_LIGHT}}}`;

const paintedLabelStyleFor = (background: string): string => {
	const month = labelFillAgainst({ background, alphaOnDark: MONTH_LABEL_ALPHA_ON_DARK });
	const weekday = labelFillAgainst({ background, alphaOnDark: WEEKDAY_LABEL_ALPHA_ON_DARK });
	return `.${MONTH_LABEL_CLASS}{fill:${month}}.${WEEKDAY_LABEL_CLASS}{fill:${weekday}}`;
};

const labelStyleFor = (background: string): string =>
	background === DEFAULT_BACKGROUND_COLOR ? LIGHT_SCHEME_LABEL_STYLE : paintedLabelStyleFor(background);

export const svgStringRenderer: SvgRenderer = ({ days, options }) => {
	const { palette, shape, background } = options;
	const layout = calendarLayout({
		days,
		shape,
		size: options.cellSize,
		gap: options.cellGap,
		showLabels: options.showLabels,
	});

	const parts: string[] = [];
	parts.push(
		`<svg viewBox="0 0 ${layout.width} ${layout.height}" width="${layout.width}" height="${layout.height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${CALENDAR_ARIA_LABEL}">`,
	);

	if (layout.monthLabels.length + layout.weekdayLabels.length > 0) {
		parts.push(`<style>${labelStyleFor(background)}</style>`);
	}

	if (background !== DEFAULT_BACKGROUND_COLOR) {
		parts.push(`<rect width="${layout.width}" height="${layout.height}" fill="${background}"/>`);
	}

	for (const { x, y, label } of layout.monthLabels) {
		parts.push(
			`<text x="${x}" y="${y}" class="${MONTH_LABEL_CLASS}" fill="${MONTH_LABEL_FILL}" font-size="${SVG_MONTH_LABEL_FONT_SIZE}" font-family="${LABEL_FONT_FAMILY}" letter-spacing="${SVG_MONTH_LABEL_LETTER_SPACING}">${label}</text>`,
		);
	}

	for (const { x, y, label } of layout.weekdayLabels) {
		parts.push(
			`<text x="${x}" y="${y}" class="${WEEKDAY_LABEL_CLASS}" fill="${WEEKDAY_LABEL_FILL}" font-size="${SVG_WEEKDAY_LABEL_FONT_SIZE}" font-family="${LABEL_FONT_FAMILY}">${label}</text>`,
		);
	}

	parts.push(`<g transform="translate(${layout.origin.x},${layout.origin.y})">`);

	for (const { x, y, level } of layout.cells) {
		parts.push(
			renderCellShape({
				shape,
				x,
				y,
				size: layout.size,
				radius: layout.radius,
				fill: palette.colors[level].hex,
				level,
			}),
		);
	}

	parts.push("</g></svg>");
	return parts.join("");
};
