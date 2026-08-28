import { describe, expect, it } from "vitest";
import { buildGridFromApi } from "./calendar-grid";
import { computeContributionStats, statsWithScrapedTotal } from "./contribution-stats";

describe("computeContributionStats", () => {
	it("counts a streak that ended on 31 December of a past Year", () => {
		const days = buildGridFromApi({
			days: [
				{ date: "2020-12-29", level: 1, count: 1 },
				{ date: "2020-12-30", level: 2, count: 4 },
				{ date: "2020-12-31", level: 3, count: 9 },
			],
			year: 2020,
		});

		expect(computeContributionStats({ days, year: 2020, today: "2026-08-28" }).currentStreak).toBe(3);
	});

	it("does not let a streak run back out of the Year it was asked about", () => {
		const days = buildGridFromApi({
			days: [{ date: "2021-01-01", level: 2, count: 4 }],
			year: 2021,
		});

		expect(computeContributionStats({ days, year: 2021, today: "2026-08-28" }).currentStreak).toBe(0);
	});

	it("totals counts and computes trailing streak + longest run", () => {
		const stats = computeContributionStats({
			year: 2024,
			today: "2024-01-04",
			days: [
				{ date: "2024-01-01", level: 1, count: 2 },
				{ date: "2024-01-02", level: 0, count: 0 },
				{ date: "2024-01-03", level: 2, count: 3 },
				{ date: "2024-01-04", level: 1, count: 1 },
			],
		});
		expect(stats.totalContributions).toBe(6);
		expect(stats.currentStreak).toBe(2);
		expect(stats.longestStreak).toBe(2);
	});

	it("skips trailing future days and a pending empty today when counting the streak", () => {
		const stats = computeContributionStats({
			year: 2024,
			today: "2024-06-15",
			days: [
				{ date: "2024-06-13", level: 2, count: 3 },
				{ date: "2024-06-14", level: 1, count: 1 },
				{ date: "2024-06-15", level: 0, count: 0 },
				{ date: "2024-06-16", level: 0, count: 0 },
			],
		});
		expect(stats.currentStreak).toBe(2);
	});

	it("distinguishes the current streak from the longest one", () => {
		const stats = computeContributionStats({
			year: 2024,
			today: "2024-01-06",
			days: [
				{ date: "2024-01-01", level: 1, count: 1 },
				{ date: "2024-01-02", level: 1, count: 1 },
				{ date: "2024-01-03", level: 1, count: 1 },
				{ date: "2024-01-04", level: 1, count: 1 },
				{ date: "2024-01-05", level: 0, count: 0 },
				{ date: "2024-01-06", level: 2, count: 2 },
			],
		});
		expect(stats.longestStreak).toBe(4);
		expect(stats.currentStreak).toBe(1);
	});

	it("reports an unknown total rather than a lower bound when an active day has no count", () => {
		const stats = computeContributionStats({
			year: 2024,
			today: "2024-01-02",
			days: [
				{ date: "2024-01-01", level: 4, count: null },
				{ date: "2024-01-02", level: 2, count: 5 },
			],
		});
		expect(stats.totalContributions).toBeNull();
	});

	it("treats an unknown count on a level-0 day as the zero it must be", () => {
		const stats = computeContributionStats({
			year: 2024,
			today: "2024-01-02",
			days: [
				{ date: "2024-01-01", level: 0, count: null },
				{ date: "2024-01-02", level: 2, count: 5 },
			],
		});
		expect(stats.totalContributions).toBe(5);
	});
});

describe("statsWithScrapedTotal", () => {
	const days = [
		{ date: "2024-01-01", level: 1, count: 3 },
		{ date: "2024-01-02", level: 1, count: 4 },
	] as const;

	it("lets a scraped total win over the computed sum", () => {
		expect(
			statsWithScrapedTotal({ days: [...days], year: 2024, today: "2024-01-02", scrapedTotal: 99 }).totalContributions,
		).toBe(99);
	});

	it("keeps a scraped zero, because zero is a fact and not a missing value", () => {
		expect(
			statsWithScrapedTotal({ days: [...days], year: 2024, today: "2024-01-02", scrapedTotal: 0 }).totalContributions,
		).toBe(0);
	});

	it("keeps the computed sum when nothing was scraped", () => {
		expect(
			statsWithScrapedTotal({ days: [...days], year: 2024, today: "2024-01-02", scrapedTotal: null })
				.totalContributions,
		).toBe(7);
	});

	it("keeps the computed sum when no total is passed at all", () => {
		expect(statsWithScrapedTotal({ days: [...days], year: 2024, today: "2024-01-02" }).totalContributions).toBe(7);
	});

	it("leaves the streaks to computeContributionStats", () => {
		const stats = statsWithScrapedTotal({ days: [...days], year: 2024, today: "2024-01-02", scrapedTotal: 99 });

		expect(stats.longestStreak).toBe(
			computeContributionStats({ days: [...days], year: 2024, today: "2024-01-02" }).longestStreak,
		);
	});
});
