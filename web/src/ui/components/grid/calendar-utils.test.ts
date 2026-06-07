import { describe, expect, it } from "vitest";
import { buildCalendarGrid, buildGridFromApi, generateData, rehydrateCells, summarize } from "./calendar-utils";

describe("buildCalendarGrid", () => {
	it("builds a full 53×7 grid", () => {
		expect(buildCalendarGrid(new Map(), 2024)).toHaveLength(53 * 7);
	});

	it("fills levels from the map and defaults the rest to 0", () => {
		const grid = buildCalendarGrid(new Map([["2024-06-15", { level: 3, count: 9 }]]), 2024);
		expect(grid.find((cell) => cell.date === "2024-06-15")?.level).toBe(3);
		expect(grid.find((cell) => cell.date === "2024-06-16")?.level).toBe(0);
	});
});

describe("buildGridFromApi", () => {
	it("maps api days into the grid", () => {
		const grid = buildGridFromApi([{ date: "2024-06-15", level: 4, count: 16 }], 2024);
		expect(grid).toHaveLength(53 * 7);
		expect(grid.find((cell) => cell.date === "2024-06-15")?.level).toBe(4);
	});
});

describe("rehydrateCells", () => {
	it("normalizes a missing count to null", () => {
		expect(rehydrateCells([{ date: "2024-01-01", level: 1, count: null }])[0]).toEqual({
			date: "2024-01-01",
			level: 1,
			count: null,
		});
	});
});

describe("summarize", () => {
	it("totals counts and computes trailing streak + longest run", () => {
		const summary = summarize([
			{ date: "2024-01-01", level: 1, count: 2 },
			{ date: "2024-01-02", level: 0, count: 0 },
			{ date: "2024-01-03", level: 2, count: 3 },
			{ date: "2024-01-04", level: 1, count: 1 },
		]);
		expect(summary.count).toBe(6);
		expect(summary.streak).toBe(2);
		expect(summary.longest).toBe(2);
	});
});

describe("generateData", () => {
	it("is deterministic and produces a full grid", () => {
		expect(generateData(7)).toEqual(generateData(7));
		expect(generateData(7)).toHaveLength(53 * 7);
	});
});
