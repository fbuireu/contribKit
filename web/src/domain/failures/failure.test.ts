import { describe, expect, it } from "vitest";
import { invalidInput, isFailure, network, notFound, parse } from "./failure";

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

describe("failure constructors", () => {
	it("notFound", () => {
		expect(notFound("torvalds")).toEqual({ kind: "NotFound", username: "torvalds" });
	});

	it("invalidInput", () => {
		expect(invalidInput({ field: "username", message: "bad" })).toEqual({
			kind: "InvalidInput",
			field: "username",
			message: "bad",
		});
	});

	it("network with a status", () => {
		expect(network({ message: "down", status: 502 })).toEqual({ kind: "Network", status: 502, message: "down" });
	});

	it("network without a status", () => {
		expect(network({ message: "down" })).toEqual({ kind: "Network", status: undefined, message: "down" });
	});

	it("parse", () => {
		expect(parse("broke")).toEqual({ kind: "Parse", message: "broke" });
	});
});
