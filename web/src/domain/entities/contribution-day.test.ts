import { describe, expect, it } from "vitest";
import { isFailure } from "../failures/failure";
import { contributionDay, emptyDay, isCount } from "./contribution-day";

describe("contributionDay", () => {
	it("is the only way from raw input to one, so a level out of range cannot exist", () => {
		const built = contributionDay({ date: "2024-06-15", level: 9, count: 1 });

		expect(isFailure(built) ? null : built.level).toBe(4);
	});

	it("clamps below as well, and rounds a fractional level", () => {
		const low = contributionDay({ date: "2024-06-15", level: -5, count: 0 });
		const fractional = contributionDay({ date: "2024-06-15", level: 2.5, count: 1 });

		expect(isFailure(low) ? null : low.level).toBe(0);
		expect(isFailure(fractional) ? null : fractional.level).toBe(3);
	});

	it("refuses a date the grid could never key on", () => {
		for (const date of ["2024-6-15", "2024-06-15T00:00:00Z", "2024-02-30", "yesterday"]) {
			expect(isFailure(contributionDay({ date, level: 1, count: 1 })), date).toBe(true);
		}
	});

	it("keeps an unknown Count unknown, because null is not zero", () => {
		const built = contributionDay({ date: "2024-06-15", level: 3, count: null });

		expect(isFailure(built) ? "failed" : built.count).toBeNull();
	});
});

describe("emptyDay", () => {
	it("pads with an unknown Count at level zero, never a measured zero", () => {
		const built = contributionDay({ date: "2024-06-15", level: 0, count: null });
		const padded = isFailure(built) ? null : emptyDay(built.date);

		expect(padded).toEqual({ date: "2024-06-15", level: 0, count: null });
	});
});

describe("isCount", () => {
	it("accepts a whole number from zero up to the largest safe integer", () => {
		expect([0, 1, 1234, Number.MAX_SAFE_INTEGER].map(isCount)).toEqual([true, true, true, true]);
	});

	it("refuses a negative, a fraction, a number past the safe range, NaN and Infinity", () => {
		expect([-1, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN, Number.POSITIVE_INFINITY].map(isCount)).toEqual([
			false,
			false,
			false,
			false,
			false,
		]);
	});
});
