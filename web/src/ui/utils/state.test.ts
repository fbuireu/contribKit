import type { ContributionDay } from "@domain/entities/types";
import { describe, expect, it } from "vitest";
import { getDays, getUsername, setDays, setUsername } from "./state";

describe("state", () => {
	it("stores and returns the days", () => {
		const days: ContributionDay[] = [{ date: "2024-01-01", level: 2, count: 4 }];
		setDays(days);
		expect(getDays()).toBe(days);
	});

	it("stores and returns the username", () => {
		setUsername("torvalds");
		expect(getUsername()).toBe("torvalds");
	});
});
