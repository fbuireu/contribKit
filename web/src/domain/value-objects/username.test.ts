import { describe, expect, it } from "vitest";
import { DEFAULT_USERNAME, isUsername, parseUsername } from "./username";

describe("parseUsername", () => {
	it("accepts a valid username", () => {
		const result = parseUsername("torvalds");
		expect(isUsername(result)).toBe(true);
		expect(isUsername(result) && result.value).toBe("torvalds");
	});

	it("trims surrounding whitespace", () => {
		const result = parseUsername("  torvalds  ");
		expect(isUsername(result) && result.value).toBe("torvalds");
	});

	it("accepts hyphens and digits", () => {
		expect(isUsername(parseUsername("a-1-b2"))).toBe(true);
	});

	it("accepts the max length (39)", () => {
		expect(isUsername(parseUsername("a".repeat(39)))).toBe(true);
	});

	it("rejects empty input", () => {
		expect(isUsername(parseUsername(""))).toBe(false);
	});

	it("rejects leading or trailing hyphen", () => {
		expect(isUsername(parseUsername("-foo"))).toBe(false);
		expect(isUsername(parseUsername("foo-"))).toBe(false);
	});

	it("rejects too long (40)", () => {
		expect(isUsername(parseUsername("a".repeat(40)))).toBe(false);
	});

	it("rejects invalid characters", () => {
		expect(isUsername(parseUsername("foo_bar"))).toBe(false);
		expect(isUsername(parseUsername("foo.bar"))).toBe(false);
	});

	it("returns an InvalidInput failure for invalid input", () => {
		const result = parseUsername("");
		expect(isUsername(result)).toBe(false);
		expect((result as { kind: string }).kind).toBe("InvalidInput");
	});
});

describe("DEFAULT_USERNAME", () => {
	it("is itself a valid username", () => {
		expect(isUsername(parseUsername(DEFAULT_USERNAME))).toBe(true);
	});
});
