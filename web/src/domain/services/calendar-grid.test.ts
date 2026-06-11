import { describe, expect, it } from "vitest";
import { buildCalendarGrid, buildGridFromApi } from "./calendar-grid";

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
