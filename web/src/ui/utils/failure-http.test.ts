import { invalidInput, network, notFound, parse } from "@domain/failures/failure";
import { describe, expect, it } from "vitest";
import { isFailure, messageFor, statusFor } from "./failure-http";

describe("isFailure", () => {
	it("detects failure-shaped objects", () => {
		expect(isFailure(notFound("torvalds"))).toBe(true);
		expect(isFailure(parse("bad json"))).toBe(true);
	});

	it("rejects non-failures", () => {
		expect(isFailure(null)).toBe(false);
		expect(isFailure("nope")).toBe(false);
		expect(isFailure({ value: 1 })).toBe(false);
	});
});

describe("statusFor", () => {
	it("maps each failure kind to a status", () => {
		expect(statusFor(notFound("x"))).toBe(404);
		expect(statusFor(invalidInput("username", "bad"))).toBe(400);
		expect(statusFor(network("down"))).toBe(502);
		expect(statusFor(parse("oops"))).toBe(502);
	});
});

describe("messageFor", () => {
	it("uses a friendly message for not-found", () => {
		expect(messageFor(notFound("ghost"))).toBe("User not found");
	});

	it("passes through the failure message otherwise", () => {
		expect(messageFor(network("github is down"))).toBe("github is down");
		expect(messageFor(invalidInput("year", "not a year"))).toBe("not a year");
	});
});
