import { invalidInput, network, notFound, parse } from "@domain/failures/failure";
import { describe, expect, it } from "vitest";
import { messageFor, statusFor } from "./failure-http";

describe("statusFor", () => {
	it("maps each failure kind to a status", () => {
		expect(statusFor(notFound("x"))).toBe(404);
		expect(statusFor(invalidInput({ field: "username", message: "bad" }))).toBe(400);
		expect(statusFor(network({ message: "down" }))).toBe(502);
		expect(statusFor(parse("oops"))).toBe(502);
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
