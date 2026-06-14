import { describe, expect, it } from "vitest";
import { addDays, chunkWeeks, DAYS_PER_WEEK, getWeekday, WEEKS_PER_YEAR } from "./dates";

describe("addDays", () => {
	it("adds days within a month", () => {
		expect(addDays({ iso: "2024-03-10", days: 5 })).toBe("2024-03-15");
	});

	it("rolls over month and year boundaries", () => {
		expect(addDays({ iso: "2024-01-31", days: 1 })).toBe("2024-02-01");
		expect(addDays({ iso: "2024-12-31", days: 1 })).toBe("2025-01-01");
	});

	it("handles negative offsets, including a leap day", () => {
		expect(addDays({ iso: "2024-03-01", days: -1 })).toBe("2024-02-29");
	});
});

describe("getWeekday", () => {
	it("returns 0 for Sunday and 6 for Saturday", () => {
		expect(getWeekday("2024-03-10")).toBe(0);
		expect(getWeekday("2024-03-16")).toBe(6);
	});

	it("returns 1 for Monday", () => {
		expect(getWeekday("2024-03-11")).toBe(1);
	});
});

describe("chunkWeeks", () => {
	it("splits a full grid into WEEKS_PER_YEAR weeks of DAYS_PER_WEEK", () => {
		const cells = Array.from({ length: WEEKS_PER_YEAR * DAYS_PER_WEEK }, (_, index) => index);
		const weeks = chunkWeeks(cells);
		expect(weeks).toHaveLength(WEEKS_PER_YEAR);
		expect(weeks[0]).toEqual([0, 1, 2, 3, 4, 5, 6]);
		expect(weeks.at(-1)?.at(-1)).toBe(WEEKS_PER_YEAR * DAYS_PER_WEEK - 1);
	});

	it("leaves trailing weeks empty when there are fewer cells", () => {
		const weeks = chunkWeeks([1, 2, 3]);
		expect(weeks).toHaveLength(WEEKS_PER_YEAR);
		expect(weeks[0]).toEqual([1, 2, 3]);
		expect(weeks[1]).toEqual([]);
	});
});
