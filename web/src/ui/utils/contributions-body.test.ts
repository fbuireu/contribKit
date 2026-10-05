import type { ContributionDay } from "@domain/entities/types";
import { describe, expect, expectTypeOf, it } from "vitest";
import { toContributionDays } from "./contributions-body";

describe("toContributionDays", () => {
	it("keeps the days that are on the calendar and drops the one that is not, as readonly data", () => {
		const days = toContributionDays([
			{ date: "2024-06-15", level: 2, count: 3 },
			{ date: "2024-02-30", level: 1, count: 1 },
			{ date: "2024-06-16", level: 9, count: null },
		]);

		expect(days).toEqual([
			{ date: "2024-06-15", level: 2, count: 3 },
			{ date: "2024-06-16", level: 4, count: null },
		]);
		expectTypeOf(days).toEqualTypeOf<readonly ContributionDay[]>();
	});
});
