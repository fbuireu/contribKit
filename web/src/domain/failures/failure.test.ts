import { describe, expect, it } from "vitest";
import { parseUsername, type Username } from "../value-objects/username";
import {
	delivery,
	FailureKind,
	invalidInput,
	isFailure,
	isFailureKind,
	network,
	notFound,
	parse,
	rateLimited,
	upstream,
} from "./failure";

const username = (raw: string): Username => {
	const parsed = parseUsername(raw);
	if (isFailure(parsed)) throw new Error(`fixture is not a Username: ${raw}`);
	return parsed;
};

describe("isFailure", () => {
	it("detects failure-shaped objects", () => {
		expect(isFailure(notFound(username("torvalds")))).toBe(true);
		expect(isFailure(parse("bad json"))).toBe(true);
	});

	it("rejects non-failures", () => {
		expect(isFailure(null)).toBe(false);
		expect(isFailure("nope")).toBe(false);
		expect(isFailure({ value: 1 })).toBe(false);
	});
});

describe("isFailureKind", () => {
	it("knows every kind of the union and nothing else", () => {
		for (const kind of Object.values(FailureKind)) expect(isFailureKind(kind), kind).toBe(true);
		expect(isFailureKind("Martian")).toBe(false);
		expect(isFailureKind(undefined)).toBe(false);
		expect(isFailureKind(404)).toBe(false);
	});
});

describe("failure constructors", () => {
	it("notFound", () => {
		expect(notFound(username("torvalds"))).toEqual({ kind: "NotFound", username: username("torvalds") });
	});

	it("invalidInput", () => {
		expect(invalidInput({ field: "username", message: "bad" })).toEqual({
			kind: "InvalidInput",
			field: "username",
			message: "bad",
		});
	});

	it("network", () => {
		expect(network("down")).toEqual({ kind: "Network", message: "down" });
	});

	it("upstream, an answer GitHub gave that is not the page", () => {
		expect(upstream("GitHub returned 503")).toEqual({ kind: "Upstream", message: "GitHub returned 503" });
	});

	it("parse", () => {
		expect(parse("broke")).toEqual({ kind: "Parse", message: "broke" });
	});

	it("rateLimited, with and without a Retry-After", () => {
		expect(rateLimited({ message: "slow down", retryAfterSeconds: 30 })).toEqual({
			kind: "RateLimited",
			message: "slow down",
			retryAfterSeconds: 30,
		});
		expect(rateLimited({ message: "slow down", retryAfterSeconds: null })).toEqual({
			kind: "RateLimited",
			message: "slow down",
			retryAfterSeconds: null,
		});
	});

	it("delivery", () => {
		expect(delivery("email routing refused the destination")).toEqual({
			kind: "Delivery",
			message: "email routing refused the destination",
		});
	});

	it("recognises every kind in the sealed set, so the next one cannot be forgotten here", () => {
		for (const kind of Object.values(FailureKind)) {
			expect(isFailure({ kind }), kind).toBe(true);
		}
	});
});
