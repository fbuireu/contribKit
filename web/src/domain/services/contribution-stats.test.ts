import { describe, expect, it } from "vitest";
import { computeContributionStats, statsWithScrapedTotal } from "./contribution-stats";
import { toIsoDate } from "./dates";

describe("computeContributionStats", () => {
	it("totals counts and computes trailing streak + longest run", () => {
		const stats = computeContributionStats([
			{ date: "2024-01-01", level: 1, count: 2 },
			{ date: "2024-01-02", level: 0, count: 0 },
			{ date: "2024-01-03", level: 2, count: 3 },
			{ date: "2024-01-04", level: 1, count: 1 },
		]);
		expect(stats.totalContributions).toBe(6);
		expect(stats.currentStreak).toBe(2);
		expect(stats.longestStreak).toBe(2);
	});

	it("skips trailing future days and a pending empty today when counting the streak", () => {
		const iso = toIsoDate;
		type DayBeforeParams = { date: Date; days: number };
		const dayBefore = ({ date, days }: DayBeforeParams) => new Date(date.getTime() - days * 86_400_000);
		const today = new Date();
		const stats = computeContributionStats([
			{ date: iso(dayBefore({ date: today, days: 2 })), level: 2, count: 3 },
			{ date: iso(dayBefore({ date: today, days: 1 })), level: 1, count: 1 },
			{ date: iso(today), level: 0, count: 0 },
			{ date: iso(dayBefore({ date: today, days: -1 })), level: 0, count: 0 },
		]);
		expect(stats.currentStreak).toBe(2);
	});

	it("distinguishes the current streak from the longest one", () => {
		const stats = computeContributionStats([
			{ date: "2024-01-01", level: 1, count: 1 },
			{ date: "2024-01-02", level: 1, count: 1 },
			{ date: "2024-01-03", level: 1, count: 1 },
			{ date: "2024-01-04", level: 1, count: 1 },
			{ date: "2024-01-05", level: 0, count: 0 },
			{ date: "2024-01-06", level: 2, count: 2 },
		]);
		expect(stats.longestStreak).toBe(4);
		expect(stats.currentStreak).toBe(1);
	});

	it("reports an unknown total rather than a lower bound when an active day has no count", () => {
		const stats = computeContributionStats([
			{ date: "2024-01-01", level: 4, count: null },
			{ date: "2024-01-02", level: 2, count: 5 },
		]);
		expect(stats.totalContributions).toBeNull();
	});

	it("treats an unknown count on a level-0 day as the zero it must be", () => {
		const stats = computeContributionStats([
			{ date: "2024-01-01", level: 0, count: null },
			{ date: "2024-01-02", level: 2, count: 5 },
		]);
		expect(stats.totalContributions).toBe(5);
	});
});

describe("statsWithScrapedTotal", () => {
	const days = [
		{ date: "2024-01-01", level: 1, count: 3 },
		{ date: "2024-01-02", level: 1, count: 4 },
	] as const;

	it("lets a scraped total win over the computed sum", () => {
		expect(statsWithScrapedTotal({ days: [...days], scrapedTotal: 99 }).totalContributions).toBe(99);
	});

	it("keeps a scraped zero, because zero is a fact and not a missing value", () => {
		expect(statsWithScrapedTotal({ days: [...days], scrapedTotal: 0 }).totalContributions).toBe(0);
	});

	it("keeps the computed sum when nothing was scraped", () => {
		expect(statsWithScrapedTotal({ days: [...days], scrapedTotal: null }).totalContributions).toBe(7);
	});

	it("keeps the computed sum when no total is passed at all", () => {
		expect(statsWithScrapedTotal({ days: [...days] }).totalContributions).toBe(7);
	});

	it("leaves the streaks to computeContributionStats", () => {
		const stats = statsWithScrapedTotal({ days: [...days], scrapedTotal: 99 });

		expect(stats.longestStreak).toBe(computeContributionStats([...days]).longestStreak);
	});
});
