import { isFailure } from "@domain/failures/failure";
import { type IsoDate, parseIsoDate } from "@domain/value-objects/iso-date";
import { describe, expect, it } from "vitest";
import { formatContribLabel, formatStreak, formatTotalContributions } from "./contribution";

const UNKNOWN_COUNT_LABEL = /^Contributions unknown on /;
const ZERO_COUNT_LABEL = /^No contributions on /;
const SINGULAR_COUNT_LABEL = /^1 contribution on /;
const GROUPED_COUNT_LABEL = /^1,234 contributions on /;

const iso = (raw: string): IsoDate => {
	const parsed = parseIsoDate(raw);
	if (isFailure(parsed)) throw new Error(`fixture is not a calendar date: ${raw}`);
	return parsed;
};

describe("formatTotalContributions", () => {
	it("says unknown rather than zero when the total could not be established", () => {
		expect(formatTotalContributions(null)).toBe("unknown");
	});

	it("groups a known total", () => {
		expect(formatTotalContributions(1234)).toBe("1,234");
		expect(formatTotalContributions(0)).toBe("0");
	});
});

describe("formatStreak", () => {
	it("says unknown rather than zero when the Streak could not be computed", () => {
		expect(formatStreak(null)).toBe("unknown");
	});

	it("prints a computed Streak, a zero included", () => {
		expect(formatStreak(12)).toBe("12");
		expect(formatStreak(0)).toBe("0");
	});
});

describe("formatContribLabel with an unknown count", () => {
	it("says the count is unknown rather than inventing one", () => {
		expect(formatContribLabel({ dateIso: iso("2024-03-15"), count: null })).toMatch(UNKNOWN_COUNT_LABEL);
	});
});

describe("formatContribLabel", () => {
	it("renders no contributions for zero", () => {
		expect(formatContribLabel({ dateIso: iso("2024-03-15"), count: 0 })).toMatch(ZERO_COUNT_LABEL);
	});

	it("renders a singular contribution", () => {
		expect(formatContribLabel({ dateIso: iso("2024-03-15"), count: 1 })).toMatch(SINGULAR_COUNT_LABEL);
	});

	it("renders many with a thousands separator", () => {
		expect(formatContribLabel({ dateIso: iso("2024-03-15"), count: 1234 })).toMatch(GROUPED_COUNT_LABEL);
	});

	it("includes the formatted date", () => {
		expect(formatContribLabel({ dateIso: iso("2024-03-15"), count: 5 })).toContain("March 15, 2024");
	});
});

describe("formatContribLabel without a date", () => {
	it("names the Count alone rather than an Invalid Date", () => {
		expect(formatContribLabel({ dateIso: null, count: 42 })).toBe("42 contributions");
		expect(formatContribLabel({ dateIso: null, count: 1 })).toBe("1 contribution");
		expect(formatContribLabel({ dateIso: null, count: 0 })).toBe("No contributions");
		expect(formatContribLabel({ dateIso: null, count: null })).toBe("Contributions unknown");
	});
});
