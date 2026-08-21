import { invalidInput, network, notFound, parse, rateLimited } from "@domain/failures/failure";
import { describe, expect, it } from "vitest";
import { messageFor, retryAfterHeader, statusFor } from "./failure-http";

describe("statusFor", () => {
	it("maps each failure kind to a status", () => {
		expect(statusFor(notFound("x"))).toBe(404);
		expect(statusFor(invalidInput({ field: "username", message: "bad" }))).toBe(400);
		expect(statusFor(network({ message: "down" }))).toBe(502);
		expect(statusFor(parse("oops"))).toBe(502);
		expect(statusFor(rateLimited({ message: "slow down", retryAfterSeconds: 60 }))).toBe(429);
	});
});

describe("messageFor", () => {
	it("uses a friendly message for not-found", () => {
		expect(messageFor(notFound("ghost"))).toBe("User not found");
	});

	it("passes through the failure message otherwise", () => {
		expect(messageFor(network({ message: "github is down" }))).toBe("github is down");
		expect(messageFor(invalidInput({ field: "year", message: "not a year" }))).toBe("not a year");
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

	it("is empty for every other kind, so a 404 never carries one", () => {
		expect(retryAfterHeader(notFound("ghost"))).toEqual({});
		expect(retryAfterHeader(network({ message: "down" }))).toEqual({});
		expect(retryAfterHeader(parse("oops"))).toEqual({});
		expect(retryAfterHeader(invalidInput({ field: "username", message: "bad" }))).toEqual({});
	});
});
