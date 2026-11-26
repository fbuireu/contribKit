import { describe, expect, it } from "vitest";
import { isFailure } from "../failures/failure";
import { dayOfMonthOf, isIsoDate, isoDateOf, monthOf, parseIsoDate, yearEndOf, yearStartOf } from "./iso-date";

describe("parseIsoDate", () => {
	it("accepts a zero-padded calendar date, which is the only shape the grid can key on", () => {
		for (const raw of ["2024-01-01", "2028-12-31", "2005-06-09"]) {
			expect(isIsoDate(parseIsoDate(raw)), raw).toBe(true);
		}
	});

	it("rejects the shapes that silently miss a map lookup", () => {
		for (const raw of ["2024-1-1", "2024-06-15T00:00:00Z", "20240615", "", "not a date", "2024-06-15 "]) {
			expect(isFailure(parseIsoDate(raw)), raw).toBe(true);
		}
	});

	it("rejects a date that looks right and does not exist", () => {
		for (const raw of ["2024-13-01", "2024-00-10", "2023-02-30", "2024-06-31"]) {
			expect(isFailure(parseIsoDate(raw)), raw).toBe(true);
		}
	});
});

describe("isoDateOf", () => {
	it("reads the local calendar day, never the UTC one", () => {
		expect(isoDateOf(new Date(2024, 0, 1, 23, 30))).toBe("2024-01-01");
		expect(isoDateOf(new Date(2024, 11, 31, 0, 30))).toBe("2024-12-31");
	});

	it("zero-pads, so lexicographic order is calendar order", () => {
		expect(isoDateOf(new Date(2024, 5, 9))).toBe("2024-06-09");
		expect(isoDateOf(new Date(2024, 5, 9)) < isoDateOf(new Date(2024, 5, 10))).toBe(true);
	});
});

describe("yearStartOf and yearEndOf", () => {
	it("name the first and the last day of a Year, leap or not", () => {
		expect(yearStartOf(2024)).toBe("2024-01-01");
		expect(yearEndOf(2024)).toBe("2024-12-31");
		expect(yearStartOf(2005)).toBe("2005-01-01");
		expect(yearEndOf(2023)).toBe("2023-12-31");
	});

	it("are dates the guard accepts, so they key the same map a parsed date does", () => {
		expect(isIsoDate(yearStartOf(2028))).toBe(true);
		expect(isIsoDate(yearEndOf(2028))).toBe(true);
		expect(yearStartOf(2028) < yearEndOf(2028)).toBe(true);
	});
});

describe("the parts a renderer needs", () => {
	it("names the month and the day without slicing at magic offsets", () => {
		const date = isoDateOf(new Date(2024, 5, 15));

		expect(monthOf(date)).toBe(6);
		expect(dayOfMonthOf(date)).toBe(15);
	});
});
