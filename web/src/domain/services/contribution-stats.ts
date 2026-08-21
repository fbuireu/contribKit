import type { ContributionDay } from "../entities/types";
import { toIsoDate } from "./dates";

export interface ContributionStats {
	readonly totalContributions: number | null;
	readonly currentStreak: number;
	readonly longestStreak: number;
}

export function computeContributionStats(days: readonly ContributionDay[]): ContributionStats {
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
	const today = toIsoDate(new Date());
	let index = sorted.length - 1;
	while (index >= 0) {
		const isFuture = sorted[index].date > today;
		const isPendingToday = sorted[index].date === today && sorted[index].level === 0;
		if (!isFuture && !isPendingToday) break;
		index--;
	}
	while (index >= 0 && sorted[index].level > 0) {
		currentStreak++;
		index--;
	}
	return { totalContributions: hasUnknownCount ? null : knownTotal, currentStreak, longestStreak };
}

export interface StatsWithScrapedTotalParams {
	days: readonly ContributionDay[];
	scrapedTotal?: number | null;
}

export const statsWithScrapedTotal = ({ days, scrapedTotal }: StatsWithScrapedTotalParams): ContributionStats => {
	const stats = computeContributionStats(days);
	return scrapedTotal == null ? stats : { ...stats, totalContributions: scrapedTotal };
};
