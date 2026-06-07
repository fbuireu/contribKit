import { describe, expect, it } from "vitest";
import { contributionError, FALLBACK_CONTRIBUTION_ERROR } from "./contribution-errors";

describe("contributionError", () => {
	it("maps known statuses to a message", () => {
		expect(contributionError(400)).toMatch(/invalid/i);
		expect(contributionError(404)).toMatch(/not found/i);
		expect(contributionError(502)).toMatch(/github/i);
	});

	it("falls back for unknown statuses", () => {
		expect(contributionError(418)).toBe(FALLBACK_CONTRIBUTION_ERROR);
		expect(contributionError(500)).toBe(FALLBACK_CONTRIBUTION_ERROR);
	});
});
