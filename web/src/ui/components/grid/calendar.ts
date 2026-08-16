import type { ContributionDay } from "@domain/entities/types";
import { addDays, GRID_CELL_COUNT, getWeekday, toIsoDate } from "@domain/services/dates";
import { mulberry32 } from "@ui/utils/mulberry";

const COUNT_SPREAD_PER_LEVEL = [0, 3, 7, 12, 24] as const;

const LEVEL_THRESHOLDS = [
	{ minScore: 0.95, level: 4 },
	{ minScore: 0.7, level: 3 },
	{ minScore: 0.45, level: 2 },
	{ minScore: 0.2, level: 1 },
] as const;

export function generateData(seed = 7): ContributionDay[] {
	const random = mulberry32(seed);
	const days: ContributionDay[] = [];
	const today = toIsoDate(new Date());
	const end = addDays({ iso: today, days: 6 - getWeekday(today) });
	const totalDays = GRID_CELL_COUNT;
	const start = addDays({ iso: end, days: -(totalDays - 1) });

	for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
		const date = addDays({ iso: start, days: dayOffset });
		const dayOfWeek = getWeekday(date);
		const progress = dayOffset / totalDays;
		let base = 0.35 + progress * 0.5;
		if (dayOfWeek === 0 || dayOfWeek === 6) base *= 0.55;
		const cluster = Math.sin(dayOffset / 9) * 0.25 + Math.sin(dayOffset / 23) * 0.2;
		const randomValue = random();
		let score = base + cluster + (randomValue - 0.5) * 0.6;
		if (random() < 0.08) score -= 0.6;
		const level = LEVEL_THRESHOLDS.find(({ minScore }) => score >= minScore)?.level ?? 0;
		const spread = COUNT_SPREAD_PER_LEVEL[level];
		const count = spread === 0 ? 0 : 1 + Math.floor(random() * spread);
		days.push({ date, level, count });
	}
	return days;
}
