import { describe, expect, it } from "vitest";
import { contributionError, FALLBACK_CONTRIBUTION_ERROR } from "./contribution-errors";

const MENTIONS_INVALID = /invalid/i;
const MENTIONS_NOT_FOUND = /not found/i;
const MENTIONS_GITHUB = /github/i;

describe("contributionError", () => {
	it("maps known statuses to a message", () => {
		expect(contributionError(400)).toMatch(MENTIONS_INVALID);
		expect(contributionError(404)).toMatch(MENTIONS_NOT_FOUND);
		expect(contributionError(502)).toMatch(MENTIONS_GITHUB);
	});

	it("falls back for unknown statuses", () => {
		expect(contributionError(418)).toBe(FALLBACK_CONTRIBUTION_ERROR);
		expect(contributionError(500)).toBe(FALLBACK_CONTRIBUTION_ERROR);
	});
});
