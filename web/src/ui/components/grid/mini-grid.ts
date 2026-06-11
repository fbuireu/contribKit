import type { ContributionDay } from "@domain/entities/types";
import { mulberry32 } from "@ui/utils/mulberry";

const DEMO_COLS = 26;
const LIVE_COLS = 53;
const ROWS = 7;
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
		cols = LIVE_COLS;
		responsive = true;
		const total = cols * ROWS;
		cells = Array.from({ length: total }, (_, index) => liveCells[index]?.level ?? 0);
	} else {
		cols = DEMO_COLS;
		responsive = false;
		const rand = mulberry32(SEED);
		cells = Array.from({ length: cols * ROWS }, (_, index) => {
			const randomValue = rand();
			const progress = Math.floor(index / ROWS) / cols;
			const boosted = randomValue + progress * 0.3 + Math.sin(index / 8) * 0.15;
			return LEVEL_THRESHOLDS.find(({ min }) => boosted > min)?.level ?? 0;
		});
	}

	const svgWidth = cols * STEP;
	const svgHeight = ROWS * STEP;
	const sizeAttrs = responsive ? `width="100%"` : `width="${svgWidth}" height="${svgHeight}"`;
	let svg = `<svg ${sizeAttrs} viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`;
	for (let columnIndex = 0; columnIndex < cols; columnIndex++) {
		for (let rowIndex = 0; rowIndex < ROWS; rowIndex++) {
			const level = cells[columnIndex * ROWS + rowIndex];
			svg += `<rect x="${columnIndex * STEP}" y="${rowIndex * STEP}" width="${CELL_SIZE}" height="${CELL_SIZE}" rx="1" fill="${palette[level]}"/>`;
		}
	}
	return `${svg}</svg>`;
}
