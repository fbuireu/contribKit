import { describe, expect, it } from "vitest";
import { type ContributionDayParams, contributionDay } from "../entities/contribution-day";
import type { ContributionDay } from "../entities/types";
import { isFailure } from "../failures/failure";
import { type IsoDate, parseIsoDate } from "../value-objects/iso-date";
import { buildGridFromApi } from "./calendar-grid";
import {
	computeContributionStats,
	statsWithScrapedTotalContributions,
	totalContributionsFor,
} from "./contribution-stats";

const day = (params: ContributionDayParams): ContributionDay => {
	const built = contributionDay(params);
	if (isFailure(built)) throw new Error(`fixture is not a Contribution Day: ${params.date}`);
	return built;
};

const iso = (raw: string): IsoDate => {
	const parsed = parseIsoDate(raw);
	if (isFailure(parsed)) throw new Error(`fixture is not a calendar date: ${raw}`);
	return parsed;
};

describe("computeContributionStats", () => {
	it("counts a streak that ended on 31 December of a past Year", () => {
		const days = buildGridFromApi({
			days: [
				day({ date: "2020-12-29", level: 1, count: 1 }),
				day({ date: "2020-12-30", level: 2, count: 4 }),
				day({ date: "2020-12-31", level: 3, count: 9 }),
			],
			year: 2020,
		});

		expect(computeContributionStats({ days, year: 2020, today: iso("2026-08-28") }).currentStreak).toBe(3);
	});

	it("does not let a streak run back out of the Year it was asked about", () => {
		const days = buildGridFromApi({
			days: [day({ date: "2021-01-01", level: 2, count: 4 })],
			year: 2021,
		});

		expect(computeContributionStats({ days, year: 2021, today: iso("2026-08-28") }).currentStreak).toBe(0);
	});

	it("adds up the Counts and computes the current and longest streaks", () => {
		const stats = computeContributionStats({
			year: 2024,
			today: iso("2024-01-04"),
			days: [
				day({ date: "2024-01-01", level: 1, count: 2 }),
				day({ date: "2024-01-02", level: 0, count: 0 }),
				day({ date: "2024-01-03", level: 2, count: 3 }),
				day({ date: "2024-01-04", level: 1, count: 1 }),
			],
		});
		expect(stats.totalContributions).toBe(6);
		expect(stats.currentStreak).toBe(2);
		expect(stats.longestStreak).toBe(2);
	});

	it("skips trailing future days and a pending empty today when counting the streak", () => {
		const stats = computeContributionStats({
			year: 2024,
			today: iso("2024-06-15"),
			days: [
				day({ date: "2024-06-13", level: 2, count: 3 }),
				day({ date: "2024-06-14", level: 1, count: 1 }),
				day({ date: "2024-06-15", level: 0, count: 0 }),
				day({ date: "2024-06-16", level: 0, count: 0 }),
			],
		});
		expect(stats.currentStreak).toBe(2);
	});

	it("distinguishes the current streak from the longest one", () => {
		const stats = computeContributionStats({
			year: 2024,
			today: iso("2024-01-06"),
			days: [
				day({ date: "2024-01-01", level: 1, count: 1 }),
				day({ date: "2024-01-02", level: 1, count: 1 }),
				day({ date: "2024-01-03", level: 1, count: 1 }),
				day({ date: "2024-01-04", level: 1, count: 1 }),
				day({ date: "2024-01-05", level: 0, count: 0 }),
				day({ date: "2024-01-06", level: 2, count: 2 }),
			],
		});
		expect(stats.longestStreak).toBe(4);
		expect(stats.currentStreak).toBe(1);
	});
});

describe("statsWithScrapedTotalContributions", () => {
	const days = [
		day({ date: "2024-01-01", level: 1, count: 3 }),
		day({ date: "2024-01-02", level: 1, count: 4 }),
	] as const;

	it("lets the scraped Total Contributions win over the computed figure", () => {
		expect(
			statsWithScrapedTotalContributions({
				days: [...days],
				year: 2024,
				today: iso("2024-01-02"),
				scrapedTotalContributions: 99,
			}).totalContributions,
		).toBe(99);
	});

	it("keeps a scraped zero, because zero is a fact and not a missing value", () => {
		expect(
			statsWithScrapedTotalContributions({
				days: [...days],
				year: 2024,
				today: iso("2024-01-02"),
				scrapedTotalContributions: 0,
			}).totalContributions,
		).toBe(0);
	});

	it("keeps the computed Total Contributions when nothing was scraped", () => {
		expect(
			statsWithScrapedTotalContributions({
				days: [...days],
				year: 2024,
				today: iso("2024-01-02"),
				scrapedTotalContributions: null,
			}).totalContributions,
		).toBe(7);
	});

	it("keeps the computed Total Contributions when no scraped figure is passed at all", () => {
		expect(
			statsWithScrapedTotalContributions({ days: [...days], year: 2024, today: iso("2024-01-02") }).totalContributions,
		).toBe(7);
	});

	it("leaves the streaks to computeContributionStats", () => {
		const stats = statsWithScrapedTotalContributions({
			days: [...days],
			year: 2024,
			today: iso("2024-01-02"),
			scrapedTotalContributions: 99,
		});

		expect(stats.longestStreak).toBe(
			computeContributionStats({ days: [...days], year: 2024, today: iso("2024-01-02") }).longestStreak,
		);
	});
});

describe("totalContributionsFor", () => {
	it("is the one place the unknown-Count rule lives, and the scraper uses it", () => {
		expect(totalContributionsFor([day({ date: "2024-01-01", level: 2, count: 5 })])).toBe(5);
		expect(
			totalContributionsFor([
				day({ date: "2024-01-01", level: 4, count: null }),
				day({ date: "2024-01-02", level: 2, count: 5 }),
			]),
			"an unknown Count on an active day voids Total Contributions",
		).toBeNull();
		expect(
			totalContributionsFor([
				day({ date: "2024-01-01", level: 0, count: null }),
				day({ date: "2024-01-02", level: 2, count: 5 }),
			]),
			"a level-0 unknown is the zero GitHub means",
		).toBe(5);
	});

	it("is the Total Contributions computeContributionStats reports, known or not", () => {
		const known = [
			day({ date: "2024-01-01", level: 1, count: 2 }),
			day({ date: "2024-01-02", level: 0, count: null }),
			day({ date: "2024-01-03", level: 3, count: 7 }),
		];
		const unknown = [
			day({ date: "2024-01-01", level: 4, count: null }),
			day({ date: "2024-01-02", level: 2, count: 5 }),
		];

		for (const days of [known, unknown]) {
			expect(computeContributionStats({ days, year: 2024, today: iso("2024-01-03") }).totalContributions).toBe(
				totalContributionsFor(days),
			);
		}
		expect(totalContributionsFor(known)).toBe(9);
		expect(totalContributionsFor(unknown)).toBeNull();
	});
});
