import { describe, expect, it } from "vitest";
import { addDays, getWeekday } from "./dates";

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
