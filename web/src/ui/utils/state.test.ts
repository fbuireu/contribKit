import { type ContributionDayParams, contributionDay } from "@domain/entities/contribution-day";
import type { ContributionDay } from "@domain/entities/types";
import { isFailure } from "@domain/failures/failure";
import { parseUsername, type Username } from "@domain/value-objects/username";
import { describe, expect, expectTypeOf, it } from "vitest";
import { getDays, getUsername, setDays, setUsername } from "./state";

const day = (params: ContributionDayParams): ContributionDay => {
	const built = contributionDay(params);
	if (isFailure(built)) throw new Error(`fixture is not a Contribution Day: ${params.date}`);
	return built;
};

describe("state", () => {
	it("stores and returns the days", () => {
		const days: ContributionDay[] = [day({ date: "2024-01-01", level: 2, count: 4 })];
		setDays(days);
		expect(getDays()).toBe(days);
	});

	it("hands out and takes readonly days, so no renderer can change the grid it draws", () => {
		expectTypeOf(getDays()).toEqualTypeOf<readonly ContributionDay[]>();
		expectTypeOf(setDays).parameter(0).toEqualTypeOf<readonly ContributionDay[]>();
	});

	it("stores and returns the Username as the value object, not as its text", () => {
		const username = parseUsername("torvalds");
		if (isFailure(username)) throw new Error("fixture is not a Username");

		setUsername(username);

		expect(getUsername()).toBe(username);
		expectTypeOf(getUsername()).toEqualTypeOf<Username | null>();
	});

	it("holds no Username until one is set, and lets it go again", () => {
		setUsername(null);

		expect(getUsername()).toBeNull();
	});
});
