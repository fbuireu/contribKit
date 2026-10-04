import { describe, expect, it } from "vitest";
import { contributionError, contributionFailureReason } from "./contribution-errors";

const MENTIONS_REACHING_GITHUB = /reach github/i;
const MENTIONS_USERNAME = /username/i;
const NOT_FOUND = "username not found, check it and try again";
const TOO_MANY = "too many requests, try again in a moment";
const FALLBACK = "something went wrong";

describe("contributionError", () => {
	it("words each kind of failure for what actually happened", () => {
		expect(contributionError({ status: 404, kind: "NotFound" })).toBe(NOT_FOUND);
		expect(contributionError({ status: 400, kind: "InvalidInput", field: "username" })).toBe("invalid username");
		expect(contributionError({ status: 400, kind: "InvalidInput", field: "year" })).toBe("invalid year");
		expect(contributionError({ status: 502, kind: "Network" })).toBe("could not reach github, try again in a moment");
		expect(contributionError({ status: 502, kind: "Parse" })).toBe(
			"github answered, but the contribution calendar could not be read",
		);
		expect(contributionError({ status: 429, kind: "RateLimited" })).toBe(TOO_MANY);
	});

	it("says it could not reach GitHub only for a network failure", () => {
		expect(contributionError({ status: 502, kind: "Parse" })).not.toMatch(MENTIONS_REACHING_GITHUB);
		expect(contributionError({ status: 502 })).not.toMatch(MENTIONS_REACHING_GITHUB);
		expect(contributionError({ status: 400, kind: "InvalidInput", field: "year" })).not.toMatch(MENTIONS_USERNAME);
	});

	it("words an answer that names no kind by its status, where the status names one", () => {
		expect(contributionError({ status: 400 })).toBe("invalid username");
		expect(contributionError({ status: 404 })).toBe(NOT_FOUND);
		expect(contributionError({ status: 429 })).toBe(TOO_MANY);
	});

	it("treats a kind it does not know as no kind at all", () => {
		expect(contributionError({ status: 404, kind: "Martian" })).toBe(NOT_FOUND);
		expect(contributionError({ status: 418, kind: "Martian", serverMessage: "teapot" })).toBe("teapot");
	});

	it("falls back for a status that names no kind, a 502 included, since GitHub may not be why", () => {
		expect(contributionError({ status: 502 })).toBe(FALLBACK);
		expect(contributionError({ status: 418 })).toBe(FALLBACK);
		expect(contributionError({ status: 500 })).toBe(FALLBACK);
	});

	it("prefers our own sentence over the server's for a kind or a status we know", () => {
		expect(contributionError({ status: 404, kind: "NotFound", serverMessage: "User not found" })).toBe(NOT_FOUND);
		expect(contributionError({ status: 404, serverMessage: "User not found" })).toBe(NOT_FOUND);
	});

	it("uses the server's message when neither the kind nor the status names one", () => {
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
