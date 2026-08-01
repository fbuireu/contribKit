import { describe, expect, it } from "vitest";
import { formatContribLabel, formatTotalContributions } from "./contribution";

const UNKNOWN_COUNT_LABEL = /^Contributions unknown on /;
const ZERO_COUNT_LABEL = /^No contributions on /;
const SINGULAR_COUNT_LABEL = /^1 contribution on /;
const GROUPED_COUNT_LABEL = /^1,234 contributions on /;

describe("formatTotalContributions", () => {
	it("says unknown rather than zero when the total could not be established", () => {
		expect(formatTotalContributions(null)).toBe("unknown");
	});

	it("groups a known total", () => {
		expect(formatTotalContributions(1234)).toBe("1,234");
		expect(formatTotalContributions(0)).toBe("0");
	});
});

describe("formatContribLabel with an unknown count", () => {
	it("says the count is unknown rather than inventing one", () => {
		expect(formatContribLabel({ dateIso: "2024-03-15", count: null })).toMatch(UNKNOWN_COUNT_LABEL);
	});
});

describe("formatContribLabel", () => {
	it("renders no contributions for zero", () => {
		expect(formatContribLabel({ dateIso: "2024-03-15", count: 0 })).toMatch(ZERO_COUNT_LABEL);
	});

	it("renders a singular contribution", () => {
		expect(formatContribLabel({ dateIso: "2024-03-15", count: 1 })).toMatch(SINGULAR_COUNT_LABEL);
	});

	it("renders many with a thousands separator", () => {
		expect(formatContribLabel({ dateIso: "2024-03-15", count: 1234 })).toMatch(GROUPED_COUNT_LABEL);
	});

	it("includes the formatted date", () => {
		expect(formatContribLabel({ dateIso: "2024-03-15", count: 5 })).toContain("March 15, 2024");
	});
});
