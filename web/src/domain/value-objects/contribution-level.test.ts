import { describe, expect, it } from "vitest";
import { clampLevel } from "./contribution-level";

describe("clampLevel", () => {
	it("passes through levels 0 to 4", () => {
		for (const level of [0, 1, 2, 3, 4]) expect(clampLevel(level)).toBe(level);
	});

	it("clamps values below 0 to 0", () => {
		expect(clampLevel(-5)).toBe(0);
	});

	it("clamps values above 4 to 4", () => {
		expect(clampLevel(99)).toBe(4);
	});
});
