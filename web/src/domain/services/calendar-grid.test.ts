import { describe, expect, it } from "vitest";
import type { ContributionDay } from "../entities/types";
import { buildCalendarGrid, buildGridFromApi, buildRollingGrid } from "./calendar-grid";
import { addDays, GRID_CELL_COUNT, getWeekday } from "./dates";

describe("buildCalendarGrid", () => {
	it("builds a full 53×7 grid", () => {
		expect(buildCalendarGrid({ map: new Map(), year: 2024 })).toHaveLength(53 * 7);
	});

	it("fills levels from the map and defaults the rest to 0", () => {
		const grid = buildCalendarGrid({ map: new Map([["2024-06-15", { level: 3, count: 9 }]]), year: 2024 });
		expect(grid.find((cell) => cell.date === "2024-06-15")?.level).toBe(3);
		expect(grid.find((cell) => cell.date === "2024-06-16")?.level).toBe(0);
	});

	it("clamps out-of-range levels", () => {
		const grid = buildCalendarGrid({ map: new Map([["2024-06-15", { level: 9, count: 1 }]]), year: 2024 });
		expect(grid.find((cell) => cell.date === "2024-06-15")?.level).toBe(4);
	});
});

describe("buildGridFromApi", () => {
	it("maps api days into the grid", () => {
		const grid = buildGridFromApi({ days: [{ date: "2024-06-15", level: 4, count: 16 }], year: 2024 });
		expect(grid).toHaveLength(53 * 7);
		expect(grid.find((cell) => cell.date === "2024-06-15")?.level).toBe(4);
	});
});

describe("buildRollingGrid", () => {
	const weekdayMajor = (): ContributionDay[] => {
		const days: ContributionDay[] = [];
		for (let weekday = 0; weekday < 7; weekday++) {
			for (let week = 0; week < 53; week++) {
				days.push({
					date: addDays({ iso: "2025-08-10", days: week * 7 + weekday }),
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
		const grid = buildRollingGrid({ days: [{ date: "2025-08-13", level: 3, count: 9 }] });
		const padded = grid.find((day) => day.date !== "2025-08-13");

		expect(padded?.count).toBeNull();
	});

	it("returns nothing when it was given nothing", () => {
		expect(buildRollingGrid({ days: [] })).toEqual([]);
	});
});
