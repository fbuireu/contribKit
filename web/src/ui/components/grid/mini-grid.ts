import type { ContributionDay } from "@domain/entities/types";
import { DAYS_PER_WEEK, WEEKS_PER_YEAR } from "@domain/services/dates";
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

export interface GenerateMiniGridParams {
	palette: readonly string[];
	liveDays?: ContributionDay[];
}

export function generateMiniGrid({ palette, liveDays }: GenerateMiniGridParams): string {
	let levels: number[];
	let cols: number;
	let responsive: boolean;

	if (liveDays && liveDays.length > 0) {
		cols = WEEKS_PER_YEAR;
		responsive = true;
		const total = cols * DAYS_PER_WEEK;
		levels = Array.from({ length: total }, (_, index) => liveDays[index]?.level ?? 0);
	} else {
		cols = DEMO_COLS;
		responsive = false;
		const rand = mulberry32(SEED);
		levels = Array.from({ length: cols * DAYS_PER_WEEK }, (_, index) => {
			const randomValue = rand();
			const progress = Math.floor(index / DAYS_PER_WEEK) / cols;
			const boosted = randomValue + progress * 0.3 + Math.sin(index / 8) * 0.15;
			return LEVEL_THRESHOLDS.find(({ min }) => boosted > min)?.level ?? 0;
		});
	}

	const svgWidth = cols * STEP;
	const svgHeight = DAYS_PER_WEEK * STEP;
	const sizeAttrs = responsive ? `width="100%"` : `width="${svgWidth}" height="${svgHeight}"`;
	let svg = `<svg ${sizeAttrs} viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`;
	for (let columnIndex = 0; columnIndex < cols; columnIndex++) {
		for (let rowIndex = 0; rowIndex < DAYS_PER_WEEK; rowIndex++) {
			const level = levels[columnIndex * DAYS_PER_WEEK + rowIndex];
			svg += `<rect x="${columnIndex * STEP}" y="${rowIndex * STEP}" width="${CELL_SIZE}" height="${CELL_SIZE}" rx="1" fill="${palette[level]}"/>`;
		}
	}
	return `${svg}</svg>`;
}
