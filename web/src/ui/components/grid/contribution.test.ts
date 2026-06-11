import { describe, expect, it } from "vitest";
import { formatContribLabel, TOTALS_PER_LEVEL } from "./contribution";

describe("TOTALS_PER_LEVEL", () => {
	it("has a representative count per level 0-4", () => {
		expect(TOTALS_PER_LEVEL).toEqual([0, 1, 4, 9, 16]);
	});
});

describe("formatContribLabel", () => {
	it("renders no contributions for zero", () => {
		expect(formatContribLabel({ dateIso: "2024-03-15", count: 0 })).toMatch(/^No contributions on /);
	});

	it("renders a singular contribution", () => {
		expect(formatContribLabel({ dateIso: "2024-03-15", count: 1 })).toMatch(/^1 contribution on /);
	});

	it("renders many with a thousands separator", () => {
		expect(formatContribLabel({ dateIso: "2024-03-15", count: 1234 })).toMatch(/^1,234 contributions on /);
	});

	it("includes the formatted date", () => {
		expect(formatContribLabel({ dateIso: "2024-03-15", count: 5 })).toContain("March 15, 2024");
	});
});
