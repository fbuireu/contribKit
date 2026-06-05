import { describe, expect, it } from "vitest";
import { invalidInput, network, notFound, parse } from "./failure";

describe("failure constructors", () => {
	it("notFound", () => {
		expect(notFound("torvalds")).toEqual({ kind: "NotFound", username: "torvalds" });
	});

	it("invalidInput", () => {
		expect(invalidInput("username", "bad")).toEqual({
			kind: "InvalidInput",
			field: "username",
			message: "bad",
		});
	});

	it("network with a status", () => {
		expect(network("down", 502)).toEqual({ kind: "Network", status: 502, message: "down" });
	});

	it("network without a status", () => {
		expect(network("down")).toEqual({ kind: "Network", status: undefined, message: "down" });
	});

	it("parse", () => {
		expect(parse("broke")).toEqual({ kind: "Parse", message: "broke" });
	});
});
