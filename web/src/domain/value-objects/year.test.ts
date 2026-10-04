import { describe, expect, it } from "vitest";
import { currentYear, isYear, parseYear, resolveYear } from "./year";

const THIS_YEAR = 2026;

describe("parseYear", () => {
	it("returns null for null, undefined or empty", () => {
		expect(parseYear({ requested: null, thisYear: THIS_YEAR })).toBeNull();
		expect(parseYear({ requested: undefined, thisYear: THIS_YEAR })).toBeNull();
		expect(parseYear({ requested: "", thisYear: THIS_YEAR })).toBeNull();
	});

	it("parses a numeric year", () => {
		const result = parseYear({ requested: 2020, thisYear: THIS_YEAR });
		expect(isYear(result) && result.value).toBe(2020);
	});

	it("parses a string year", () => {
		const result = parseYear({ requested: "2015", thisYear: THIS_YEAR });
		expect(isYear(result) && result.value).toBe(2015);
	});

	it("accepts MIN_YEAR, the product floor (2005)", () => {
		expect(isYear(parseYear({ requested: 2005, thisYear: THIS_YEAR }))).toBe(true);
	});

	it("accepts the current year", () => {
		expect(isYear(parseYear({ requested: THIS_YEAR, thisYear: THIS_YEAR }))).toBe(true);
	});

	it("rejects years before 2005", () => {
		const result = parseYear({ requested: 2004, thisYear: THIS_YEAR });
		expect(isYear(result)).toBe(false);
		expect((result as { kind: string }).kind).toBe("InvalidInput");
	});

	it("rejects future years", () => {
		expect(isYear(parseYear({ requested: THIS_YEAR + 1, thisYear: THIS_YEAR }))).toBe(false);
	});

	it("rejects non-integer input", () => {
		const result = parseYear({ requested: "notayear", thisYear: THIS_YEAR });
		expect(isYear(result)).toBe(false);
		expect((result as { kind: string }).kind).toBe("InvalidInput");
	});

	it("bounds a Year by the year its caller passes, not by the clock", () => {
		const after = parseYear({ requested: 2030, thisYear: 2031 });
		const before = parseYear({ requested: 2031, thisYear: 2030 });

		expect(isYear(after) && after.value).toBe(2030);
		expect(before).toEqual({ kind: "InvalidInput", field: "year", message: "Year must be between 2005 and 2030" });
	});

	it("rejects a year with trailing junk instead of truncating it", () => {
		expect(isYear(parseYear({ requested: "2020abc", thisYear: THIS_YEAR }))).toBe(false);
		expect(isYear(parseYear({ requested: "2020.5", thisYear: THIS_YEAR }))).toBe(false);
	});
});

describe("currentYear", () => {
	it("is the Year its caller read off the clock", () => {
		const year = currentYear(2031);
		expect(isYear(year)).toBe(true);
		expect(year.value).toBe(2031);
	});
});

describe("resolveYear", () => {
	it("answers this year when no Year was asked for", () => {
		expect(resolveYear({ requested: null, thisYear: 2026 })).toBe(2026);
		expect(resolveYear({ requested: undefined, thisYear: 2026 })).toBe(2026);
		expect(resolveYear({ requested: "", thisYear: 2026 })).toBe(2026);
	});

	it("keeps a Year from MIN_YEAR to this year", () => {
		expect(resolveYear({ requested: "2005", thisYear: 2026 })).toBe(2005);
		expect(resolveYear({ requested: "2020", thisYear: 2026 })).toBe(2020);
		expect(resolveYear({ requested: "2026", thisYear: 2026 })).toBe(2026);
	});

	it("answers this year for a whole number that names no Year, before MIN_YEAR or after this year", () => {
		expect(resolveYear({ requested: "-5", thisYear: 2026 })).toBe(2026);
		expect(resolveYear({ requested: "2004", thisYear: 2026 })).toBe(2026);
		expect(resolveYear({ requested: "2027", thisYear: 2026 })).toBe(2026);
	});

	it("answers this year for anything that is not a whole number", () => {
		expect(resolveYear({ requested: "2020.5", thisYear: 2026 })).toBe(2026);
		expect(resolveYear({ requested: "2020abc", thisYear: 2026 })).toBe(2026);
	});
});
