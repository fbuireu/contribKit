import { type ContributionDayParams, contributionDay } from "@domain/entities/contribution-day";
import type { ContributionDay } from "@domain/entities/types";
import { isFailure } from "@domain/failures/failure";
import { describe, expect, it } from "vitest";
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

	it("stores and returns the username", () => {
		setUsername("torvalds");
		expect(getUsername()).toBe("torvalds");
	});
});
