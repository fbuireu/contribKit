import type { ContributionCalendar } from "@domain/entities/contribution-calendar";
import { notFound } from "@domain/failures/failure";
import type { ContributionsRepository } from "@domain/repositories/contributions-repository";
import type { Username } from "@domain/value-objects/username";
import { describe, expect, it, vi } from "vitest";
import { fetchContributions } from "./fetch-contributions";

const username = { _tag: "Username", value: "torvalds" } as Username;
const calendar: ContributionCalendar = { username: "torvalds", days: [], total: 0 };

describe("fetchContributions", () => {
	it("delegates to the repository with the given params and returns the calendar", async () => {
		const fetch = vi.fn().mockResolvedValue(calendar);
		const repository: ContributionsRepository = { fetch };

		const result = await fetchContributions(repository)({ username, year: null });

		expect(fetch).toHaveBeenCalledWith({ username, year: null });
		expect(result).toBe(calendar);
	});

	it("passes through a repository failure unchanged", async () => {
		const failure = notFound("torvalds");
		const repository: ContributionsRepository = { fetch: vi.fn().mockResolvedValue(failure) };

		const result = await fetchContributions(repository)({ username, year: null });

		expect(result).toBe(failure);
	});
});
