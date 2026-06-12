import type { ContributionDay } from "@domain/entities/types";
import { SVG_DAYS_PER_WEEK, SVG_WEEKS } from "@domain/services/svg-geometry";
import { mulberry32 } from "@ui/utils/mulberry";

const DEMO_COLS = 26;
const CELL_SIZE = 4;
const GAP = 1;
const STEP = CELL_SIZE + GAP;
const SEED = 99;

const LEVEL_THRESHOLDS = [
	{ min: 0.92, level: 4 },
	{ min: 0.78, level: 3 },
	{ min: 0.62, level: 2 },
	{ min: 0.42, level: 1 },
] as const;

export function generateMiniGrid(palette: readonly string[], liveCells?: ContributionDay[]): string {
	let cells: number[];
	let cols: number;
	let responsive: boolean;

	if (liveCells && liveCells.length > 0) {
		cols = SVG_WEEKS;
		responsive = true;
		const total = cols * SVG_DAYS_PER_WEEK;
		cells = Array.from({ length: total }, (_, index) => liveCells[index]?.level ?? 0);
	} else {
		cols = DEMO_COLS;
		responsive = false;
		const rand = mulberry32(SEED);
		cells = Array.from({ length: cols * SVG_DAYS_PER_WEEK }, (_, index) => {
			const randomValue = rand();
			const progress = Math.floor(index / SVG_DAYS_PER_WEEK) / cols;
			const boosted = randomValue + progress * 0.3 + Math.sin(index / 8) * 0.15;
			return LEVEL_THRESHOLDS.find(({ min }) => boosted > min)?.level ?? 0;
		});
	}

	const svgWidth = cols * STEP;
	const svgHeight = SVG_DAYS_PER_WEEK * STEP;
	const sizeAttrs = responsive ? `width="100%"` : `width="${svgWidth}" height="${svgHeight}"`;
	let svg = `<svg ${sizeAttrs} viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`;
	for (let columnIndex = 0; columnIndex < cols; columnIndex++) {
		for (let rowIndex = 0; rowIndex < SVG_DAYS_PER_WEEK; rowIndex++) {
			const level = cells[columnIndex * SVG_DAYS_PER_WEEK + rowIndex];
			svg += `<rect x="${columnIndex * STEP}" y="${rowIndex * STEP}" width="${CELL_SIZE}" height="${CELL_SIZE}" rx="1" fill="${palette[level]}"/>`;
		}
	}
	return `${svg}</svg>`;
}
