import { delivery, invalidInput, network, notFound, parse, rateLimited } from "@domain/failures/failure";
import type { Username } from "@domain/value-objects/username";
import { describe, expect, it } from "vitest";
import { messageFor, reasonFor, retryAfterHeader, statusFor } from "./failure-http";

const handle = (value: string): Username => ({ _tag: "Username", value });

describe("statusFor", () => {
	it("maps each failure kind to a status", () => {
		expect(statusFor(notFound(handle("x")))).toBe(404);
		expect(statusFor(invalidInput({ field: "username", message: "bad" }))).toBe(400);
		expect(statusFor(network({ message: "down" }))).toBe(502);
		expect(statusFor(parse("oops"))).toBe(502);
		expect(statusFor(rateLimited({ message: "slow down", retryAfterSeconds: 60 }))).toBe(429);
		expect(statusFor(delivery("no destination"))).toBe(502);
	});
});

describe("messageFor", () => {
	it("uses a friendly message for not-found", () => {
		expect(messageFor(notFound(handle("ghost")))).toBe("User not found");
	});

	it("answers a fixed sentence for a Delivery failure, because its message is the platform's", () => {
		expect(messageFor(delivery("destination address not verified"))).toBe("Could not send your message");
	});

	it("passes through the failure message otherwise", () => {
		expect(messageFor(network({ message: "github is down" }))).toBe("github is down");
		expect(messageFor(invalidInput({ field: "year", message: "not a year" }))).toBe("not a year");
	});
});

describe("reasonFor", () => {
	it("keeps the platform's own wording for a Delivery failure, which is what the log needs", () => {
		expect(reasonFor(delivery("destination address not verified"))).toBe("destination address not verified");
	});

	it("still never echoes a username for NotFound", () => {
		expect(reasonFor(notFound(handle("ghost")))).toBe("User not found");
	});

	it("agrees with messageFor everywhere the two are not deliberately apart", () => {
		for (const failure of [
			network({ message: "down" }),
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
		expect(retryAfterHeader(notFound(handle("ghost")))).toEqual({});
		expect(retryAfterHeader(network({ message: "down" }))).toEqual({});
		expect(retryAfterHeader(parse("oops"))).toEqual({});
		expect(retryAfterHeader(invalidInput({ field: "username", message: "bad" }))).toEqual({});
		expect(retryAfterHeader(delivery("no destination"))).toEqual({});
	});
});
