import type { ContributionDay } from "../entities/types";

export interface ContributionStats {
	readonly totalContributions: number | null;
	readonly currentStreak: number;
	readonly longestStreak: number;
}

export interface ComputeContributionStatsParams {
	readonly days: readonly ContributionDay[];
	readonly year: number;
	readonly today: string;
}

export function computeContributionStats({ days, year, today }: ComputeContributionStatsParams): ContributionStats {
	const sorted = [...days].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
	let knownTotal = 0,
		currentStreak = 0,
		longestStreak = 0,
		run = 0,
		hasUnknownCount = false;
	for (const day of sorted) {
		if (day.count === null) hasUnknownCount ||= day.level > 0;
		else knownTotal += day.count;
		if (day.level > 0) {
			run++;
			if (run > longestStreak) longestStreak = run;
		} else run = 0;
	}
	const yearStart = `${year}-01-01`;
	const yearEnd = `${year}-12-31`;
	const anchor = yearEnd < today ? yearEnd : today;
	let index = sorted.length - 1;
	while (index >= 0) {
		const isAfterAnchor = sorted[index].date > anchor;
		const isPendingToday = sorted[index].date === today && sorted[index].level === 0;
		if (!isAfterAnchor && !isPendingToday) break;
		index--;
	}
	while (index >= 0 && sorted[index].date >= yearStart && sorted[index].level > 0) {
		currentStreak++;
		index--;
	}
	return { totalContributions: hasUnknownCount ? null : knownTotal, currentStreak, longestStreak };
}

export interface StatsWithScrapedTotalParams {
	readonly days: readonly ContributionDay[];
	readonly year: number;
	readonly today: string;
	readonly scrapedTotal?: number | null;
}

export const statsWithScrapedTotal = ({
	days,
	year,
	today,
	scrapedTotal,
}: StatsWithScrapedTotalParams): ContributionStats => {
	const stats = computeContributionStats({ days, year, today });
	return scrapedTotal == null ? stats : { ...stats, totalContributions: scrapedTotal };
};
