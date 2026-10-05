import type { ContributionDay } from "@domain/entities/types";
import { DAYS_PER_WEEK, weeksOf } from "@domain/services/dates";
import type { PaletteColors } from "@domain/value-objects/palette";
import { mulberry32 } from "../../utils/mulberry";

const DEMO_WEEK_COUNT = 26;
const CELL_SIZE = 4;
const GAP = 1;
const STEP = CELL_SIZE + GAP;
const SEED = 99;

const LEVEL_THRESHOLDS = [
	{ minScore: 0.92, level: 4 },
	{ minScore: 0.78, level: 3 },
	{ minScore: 0.62, level: 2 },
	{ minScore: 0.42, level: 1 },
] as const;

export interface GenerateMiniGridParams {
	palette: PaletteColors;
	liveDays?: readonly ContributionDay[];
}

export function generateMiniGrid({ palette, liveDays }: GenerateMiniGridParams): string {
	let levels: number[];
	let weekCount: number;
	let responsive: boolean;

	if (liveDays && liveDays.length > 0) {
		weekCount = weeksOf(liveDays).length;
		responsive = true;
		levels = Array.from({ length: weekCount * DAYS_PER_WEEK }, (_, index) => liveDays[index]?.level ?? 0);
	} else {
		weekCount = DEMO_WEEK_COUNT;
		responsive = false;
		const rand = mulberry32(SEED);
		levels = Array.from({ length: weekCount * DAYS_PER_WEEK }, (_, index) => {
			const randomValue = rand();
			const progress = Math.floor(index / DAYS_PER_WEEK) / weekCount;
			const boosted = randomValue + progress * 0.3 + Math.sin(index / 8) * 0.15;
			return LEVEL_THRESHOLDS.find(({ minScore }) => boosted > minScore)?.level ?? 0;
		});
	}

	const svgWidth = weekCount * STEP;
	const svgHeight = DAYS_PER_WEEK * STEP;
	const sizeAttrs = responsive ? `width="100%"` : `width="${svgWidth}" height="${svgHeight}"`;
	let svg = `<svg ${sizeAttrs} viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`;
	for (let weekIndex = 0; weekIndex < weekCount; weekIndex++) {
		for (let dayIndex = 0; dayIndex < DAYS_PER_WEEK; dayIndex++) {
			const level = levels[weekIndex * DAYS_PER_WEEK + dayIndex];
			svg += `<rect x="${weekIndex * STEP}" y="${dayIndex * STEP}" width="${CELL_SIZE}" height="${CELL_SIZE}" rx="1" fill="${palette[level].hex}"/>`;
		}
	}
	return `${svg}</svg>`;
}
