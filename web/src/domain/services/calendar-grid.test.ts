import { describe, expect, it } from "vitest";
import { type ContributionDayParams, contributionDay } from "../entities/contribution-day";
import type { ContributionDay } from "../entities/types";
import { isFailure } from "../failures/failure";
import { type IsoDate, parseIsoDate } from "../value-objects/iso-date";
import { MIN_YEAR } from "../value-objects/year";
import { buildGridFromApi, buildRollingGrid } from "./calendar-grid";
import { addDays, DAYS_PER_WEEK, GRID_CELL_COUNT, getWeekday } from "./dates";

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

describe("buildGridFromApi", () => {
	it("builds a full 53×7 grid", () => {
		expect(buildGridFromApi({ days: [], year: 2024 })).toHaveLength(53 * 7);
	});

	it("maps api days into the grid", () => {
		const grid = buildGridFromApi({ days: [day({ date: "2024-06-15", level: 4, count: 16 })], year: 2024 });
		expect(grid).toHaveLength(53 * 7);
		expect(grid.find((cell) => cell.date === "2024-06-15")?.level).toBe(4);
	});

	it("fills levels from the days given and defaults the rest to 0", () => {
		const grid = buildGridFromApi({ days: [day({ date: "2024-06-15", level: 3, count: 9 })], year: 2024 });
		expect(grid.find((cell) => cell.date === "2024-06-15")?.level).toBe(3);
		expect(grid.find((cell) => cell.date === "2024-06-16")?.level).toBe(0);
	});

	it("carries the level it was handed, because the day was already clamped when it was built", () => {
		const grid = buildGridFromApi({ days: [day({ date: "2024-06-15", level: 9, count: 1 })], year: 2024 });

		expect(grid.find((cell) => cell.date === "2024-06-15")?.level).toBe(4);
	});

	it("pads a day it was never given with an unknown Count, not a zero", () => {
		const grid = buildGridFromApi({ days: [day({ date: "2024-06-15", level: 3, count: 9 })], year: 2024 });

		expect(grid.find((cell) => cell.date === "2024-06-16")?.count).toBeNull();
	});
});

describe("buildRollingGrid", () => {
	const weekdayMajor = (): ContributionDay[] => {
		const days: ContributionDay[] = [];
		for (let weekday = 0; weekday < 7; weekday++) {
			for (let week = 0; week < 53; week++) {
				days.push({
					date: addDays({ iso: iso("2025-08-10"), days: week * 7 + weekday }),
					level: 1,
					count: week * 7 + weekday,
				});
			}
		}
		return days;
	};

	it("returns a full grid of cells", () => {
		expect(buildRollingGrid({ days: weekdayMajor() })).toHaveLength(GRID_CELL_COUNT);
	});

	it("orders the grid chronologically even when GitHub emits it weekday-major", () => {
		const grid = buildRollingGrid({ days: weekdayMajor() });
		const dates = grid.map((day) => day.date);

		expect([...dates].sort()).toEqual(dates);
	});

	it("puts consecutive dates in consecutive cells, not seven days apart", () => {
		const grid = buildRollingGrid({ days: weekdayMajor() });

		expect(grid[1].date).toBe(addDays({ iso: grid[0].date, days: 1 }));
	});

	it("keeps each Count with its own date", () => {
		const source = weekdayMajor();
		const grid = buildRollingGrid({ days: source });
		const byDate = new Map(source.map((day) => [day.date, day.count]));

		for (const day of grid) {
			if (byDate.has(day.date)) expect(day.count).toBe(byDate.get(day.date));
		}
	});

	it("starts on a Sunday so chunkWeeks yields real Contribution Weeks", () => {
		const grid = buildRollingGrid({ days: weekdayMajor() });

		expect(getWeekday(grid[0].date)).toBe(0);
	});

	it("ends on the Saturday of the last day's week, so the window rolls with the data", () => {
		const grid = buildRollingGrid({ days: weekdayMajor() });

		expect(getWeekday(grid[grid.length - 1].date)).toBe(6);
	});

	it("pads a day it was never given with an unknown Count, not a zero", () => {
		const grid = buildRollingGrid({ days: [day({ date: "2025-08-13", level: 3, count: 9 })] });
		const padded = grid.find((day) => day.date !== "2025-08-13");

		expect(padded?.count).toBeNull();
	});

	it("returns nothing when it was given nothing", () => {
		expect(buildRollingGrid({ days: [] })).toEqual([]);
	});
});

describe("the Year-anchored grid covers the Year", () => {
	it("reaches 31 December in every Year the app offers, 2028 and 2056 included", () => {
		const uncovered: number[] = [];
		for (let year = MIN_YEAR; year <= 2060; year++) {
			const days = buildGridFromApi({ days: [], year });
			if (days[0].date > `${year}-01-01` || days[days.length - 1].date < `${year}-12-31`) uncovered.push(year);
		}

		expect(uncovered, "a leap Year opening on a Saturday needs 372 cells and 53 x 7 is 371").toEqual([]);
	});

	it("emits whole weeks that start on Sunday", () => {
		for (const year of [2024, 2028, 2056]) {
			const days = buildGridFromApi({ days: [], year });

			expect(days.length % DAYS_PER_WEEK, String(year)).toBe(0);
			expect(getWeekday(days[0].date), String(year)).toBe(0);
		}
	});
});
