import {
	delivery,
	invalidInput,
	isFailure,
	network,
	notFound,
	parse,
	rateLimited,
	upstream,
} from "@domain/failures/failure";
import { parseUsername, type Username } from "@domain/value-objects/username";
import { describe, expect, it } from "vitest";
import { errorBodyFor, messageFor, reasonFor, retryAfterHeader, statusFor } from "./failure-http";

const username = (raw: string): Username => {
	const parsed = parseUsername(raw);
	if (isFailure(parsed)) throw new Error(`fixture is not a Username: ${raw}`);
	return parsed;
};

describe("statusFor", () => {
	it("maps each failure kind to a status", () => {
		expect(statusFor(notFound(username("x")))).toBe(404);
		expect(statusFor(invalidInput({ field: "username", message: "bad" }))).toBe(400);
		expect(statusFor(network("down"))).toBe(502);
		expect(statusFor(upstream("GitHub returned 503"))).toBe(502);
		expect(statusFor(parse("oops"))).toBe(502);
		expect(statusFor(rateLimited({ message: "slow down", retryAfterSeconds: 60 }))).toBe(429);
		expect(statusFor(delivery("no destination"))).toBe(502);
	});
});

describe("messageFor", () => {
	it("uses a friendly message for not-found", () => {
		expect(messageFor(notFound(username("ghost")))).toBe("User not found");
	});

	it("answers a fixed sentence for a Delivery failure, because its message is the platform's", () => {
		expect(messageFor(delivery("destination address not verified"))).toBe("Could not send your message");
	});

	it("answers a fixed sentence for a Network failure, because its message is the platform's wording", () => {
		expect(messageFor(network("fetch failed: socket hang up"))).toBe("Could not reach GitHub");
	});

	it("passes through the failure message otherwise", () => {
		expect(messageFor(upstream("GitHub returned 503"))).toBe("GitHub returned 503");
		expect(messageFor(invalidInput({ field: "year", message: "not a year" }))).toBe("not a year");
	});
});

describe("reasonFor", () => {
	it("keeps the platform's own wording for a Delivery failure, which is what the log needs", () => {
		expect(reasonFor(delivery("destination address not verified"))).toBe("destination address not verified");
	});

	it("keeps the platform's own wording for a Network failure, which is what the log needs", () => {
		expect(reasonFor(network("fetch failed: socket hang up"))).toBe("fetch failed: socket hang up");
	});

	it("still never echoes a username for NotFound", () => {
		expect(reasonFor(notFound(username("ghost")))).toBe("User not found");
	});

	it("agrees with messageFor everywhere the two are not deliberately apart", () => {
		for (const failure of [
			upstream("GitHub returned 503"),
			parse("oops"),
			invalidInput({ field: "year", message: "bad" }),
		]) {
			expect(reasonFor(failure)).toBe(messageFor(failure));
		}
	});
});

describe("retryAfterHeader", () => {
	it("passes on the wait GitHub named", () => {
		expect(retryAfterHeader(rateLimited({ message: "slow down", retryAfterSeconds: 120 }))).toEqual({
			"Retry-After": "120",
		});
	});

	it("says nothing when GitHub named none, rather than inventing a wait", () => {
		expect(retryAfterHeader(rateLimited({ message: "slow down", retryAfterSeconds: null }))).toEqual({});
	});

	it("passes a zero through, because a wait that has already elapsed is not an unknown one", () => {
		expect(retryAfterHeader(rateLimited({ message: "slow down", retryAfterSeconds: 0 }))).toEqual({
			"Retry-After": "0",
		});
	});

	it("is empty for every other kind, so a 404 never carries one", () => {
		expect(retryAfterHeader(notFound(username("ghost")))).toEqual({});
		expect(retryAfterHeader(network("down"))).toEqual({});
		expect(retryAfterHeader(upstream("GitHub returned 503"))).toEqual({});
		expect(retryAfterHeader(parse("oops"))).toEqual({});
		expect(retryAfterHeader(invalidInput({ field: "username", message: "bad" }))).toEqual({});
		expect(retryAfterHeader(delivery("no destination"))).toEqual({});
	});
});

describe("errorBodyFor", () => {
	it("names the failure's kind beside its message, so a client can word what happened", () => {
		expect(errorBodyFor(notFound(username("ghost")))).toEqual({ error: "User not found", kind: "NotFound" });
		expect(errorBodyFor(network("fetch failed: socket hang up"))).toEqual({
			error: "Could not reach GitHub",
			kind: "Network",
		});
		expect(errorBodyFor(upstream("GitHub returned 503"))).toEqual({
			error: "GitHub returned 503",
			kind: "Upstream",
		});
		expect(errorBodyFor(parse("Could not parse contributions"))).toEqual({
			error: "Could not parse contributions",
			kind: "Parse",
		});
		expect(
			errorBodyFor(rateLimited({ message: "GitHub is rate-limiting this Worker", retryAfterSeconds: 60 })),
		).toEqual({ error: "GitHub is rate-limiting this Worker", kind: "RateLimited" });
	});

	it("adds the field a rejected input names", () => {
		expect(errorBodyFor(invalidInput({ field: "year", message: "Year must be an integer" }))).toEqual({
			error: "Year must be an integer",
			kind: "InvalidInput",
			field: "year",
		});
	});
});
