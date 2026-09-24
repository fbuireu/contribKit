import { describe, expect, it } from "vitest";
import { contributionError, contributionFailureReason } from "./contribution-errors";

const MENTIONS_INVALID = /invalid/i;
const MENTIONS_NOT_FOUND = /not found/i;
const MENTIONS_GITHUB = /github/i;
const FALLBACK = "something went wrong";

describe("contributionError", () => {
	it("maps known statuses to a message", () => {
		expect(contributionError({ status: 400 })).toMatch(MENTIONS_INVALID);
		expect(contributionError({ status: 404 })).toMatch(MENTIONS_NOT_FOUND);
		expect(contributionError({ status: 502 })).toMatch(MENTIONS_GITHUB);
	});

	it("falls back for unknown statuses", () => {
		expect(contributionError({ status: 418 })).toBe(FALLBACK);
		expect(contributionError({ status: 500 })).toBe(FALLBACK);
	});

	it("prefers our own sentence over the server's for a status we know", () => {
		expect(contributionError({ status: 404, serverMessage: "User not found" })).toMatch(MENTIONS_NOT_FOUND);
		expect(contributionError({ status: 404, serverMessage: "User not found" })).not.toBe("User not found");
	});

	it("uses the server's message for a status we do not know", () => {
		expect(contributionError({ status: 418, serverMessage: "teapot" })).toBe("teapot");
	});

	it("falls back when the server sent no message either", () => {
		expect(contributionError({ status: 418, serverMessage: undefined })).toBe(FALLBACK);
		expect(contributionError({ status: 418, serverMessage: null })).toBe(FALLBACK);
	});
});

describe("contributionFailureReason", () => {
	it("names each status the sentence table knows by a closed reason", () => {
		expect(contributionFailureReason(400)).toBe("invalid_username");
		expect(contributionFailureReason(404)).toBe("not_found");
		expect(contributionFailureReason(429)).toBe("rate_limited");
		expect(contributionFailureReason(502)).toBe("upstream");
	});

	it("answers unknown for any other status, so no status code leaks as a free value", () => {
		expect(contributionFailureReason(418)).toBe("unknown");
		expect(contributionFailureReason(500)).toBe("unknown");
	});
});
