import { describe, expect, it } from "vitest";
import { isYear, parseYear } from "./year";

const CURRENT_YEAR = new Date().getFullYear();

describe("parseYear", () => {
	it("returns null for null, undefined or empty", () => {
		expect(parseYear(null)).toBeNull();
		expect(parseYear(undefined)).toBeNull();
		expect(parseYear("")).toBeNull();
	});

	it("parses a numeric year", () => {
		expect(isYear(parseYear(2020)) && (parseYear(2020) as { value: number }).value).toBe(2020);
	});

	it("parses a string year", () => {
		const result = parseYear("2015");
		expect(isYear(result) && result.value).toBe(2015);
	});

	it("accepts the GitHub launch year (2005)", () => {
		expect(isYear(parseYear(2005))).toBe(true);
	});

	it("accepts the current year", () => {
		expect(isYear(parseYear(CURRENT_YEAR))).toBe(true);
	});

	it("rejects years before 2005", () => {
		const result = parseYear(2004);
		expect(isYear(result)).toBe(false);
		expect((result as { kind: string }).kind).toBe("InvalidInput");
	});

	it("rejects future years", () => {
		expect(isYear(parseYear(CURRENT_YEAR + 1))).toBe(false);
	});

	it("rejects non-integer input", () => {
		const result = parseYear("notayear");
		expect(isYear(result)).toBe(false);
		expect((result as { kind: string }).kind).toBe("InvalidInput");
	});
});
