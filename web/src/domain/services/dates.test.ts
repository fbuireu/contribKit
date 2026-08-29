import { describe, expect, it } from "vitest";
import { isFailure } from "../failures/failure";
import { type IsoDate, parseIsoDate } from "../value-objects/iso-date";
import { addDays, chunkWeeks, DAYS_PER_WEEK, getWeekday, toIsoDate, WEEKS_PER_YEAR, weeksFor } from "./dates";

const iso = (raw: string): IsoDate => {
	const parsed = parseIsoDate(raw);
	if (isFailure(parsed)) throw new Error(`fixture is not a calendar date: ${raw}`);
	return parsed;
};

describe("toIsoDate", () => {
	it("reads the local calendar fields, not the UTC ones", () => {
		expect(toIsoDate(new Date(2024, 2, 10, 0, 30))).toBe("2024-03-10");
		expect(toIsoDate(new Date(2024, 2, 10, 12, 0))).toBe("2024-03-10");
		expect(toIsoDate(new Date(2024, 2, 10, 23, 30))).toBe("2024-03-10");
	});

	it("round-trips the noon anchor the rest of this module builds on", () => {
		expect(toIsoDate(new Date("2024-03-10T12:00:00"))).toBe("2024-03-10");
	});
});

describe("addDays", () => {
	it("adds days within a month", () => {
		expect(addDays({ iso: iso("2024-03-10"), days: 5 })).toBe("2024-03-15");
	});

	it("rolls over month and year boundaries", () => {
		expect(addDays({ iso: iso("2024-01-31"), days: 1 })).toBe("2024-02-01");
		expect(addDays({ iso: iso("2024-12-31"), days: 1 })).toBe("2025-01-01");
	});

	it("handles negative offsets, including a leap day", () => {
		expect(addDays({ iso: iso("2024-03-01"), days: -1 })).toBe("2024-02-29");
	});
});

describe("getWeekday", () => {
	it("returns 0 for Sunday and 6 for Saturday", () => {
		expect(getWeekday(iso("2024-03-10"))).toBe(0);
		expect(getWeekday(iso("2024-03-16"))).toBe(6);
	});

	it("returns 1 for Monday", () => {
		expect(getWeekday(iso("2024-03-11"))).toBe(1);
	});
});

describe("chunkWeeks", () => {
	it("splits a full grid into WEEKS_PER_YEAR weeks of DAYS_PER_WEEK", () => {
		const days = Array.from({ length: WEEKS_PER_YEAR * DAYS_PER_WEEK }, (_, index) => index);
		const weeks = chunkWeeks(days);
		expect(weeks).toHaveLength(WEEKS_PER_YEAR);
		expect(weeks[0]).toEqual([0, 1, 2, 3, 4, 5, 6]);
		expect(weeks.at(-1)?.at(-1)).toBe(WEEKS_PER_YEAR * DAYS_PER_WEEK - 1);
	});

	it("chunks whatever it is given, because the grid decides how many weeks a Year takes", () => {
		expect(chunkWeeks([1, 2, 3])).toEqual([[1, 2, 3]]);
		expect(chunkWeeks(Array.from({ length: 54 * DAYS_PER_WEEK }, (_, index) => index))).toHaveLength(54);
		expect(chunkWeeks([])).toEqual([]);
	});

	it("needs a 54th week only when a leap Year opens on a Saturday", () => {
		const wide: number[] = [];
		for (let year = 2005; year <= 2060; year++) if (weeksFor(year) !== WEEKS_PER_YEAR) wide.push(year);

		expect(wide).toEqual([2028, 2056]);
		for (const year of wide) expect(weeksFor(year)).toBe(54);
	});
});
