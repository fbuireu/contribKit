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

	it("forces a number that is not an index into one, because the doc says it never fails", () => {
		expect(clampLevel(Number.NaN)).toBe(0);
		expect(clampLevel(Number.POSITIVE_INFINITY)).toBe(4);
		expect(clampLevel(Number.NEGATIVE_INFINITY)).toBe(0);
		expect(clampLevel(2.5)).toBe(3);
		expect(clampLevel(2.4)).toBe(2);
	});

	it("only ever answers an index a five-colour Palette can be read with", () => {
		const colors = ["a", "b", "c", "d", "e"] as const;

		for (const raw of [Number.NaN, -1, 0, 2.5, 4, 99, Number.POSITIVE_INFINITY]) {
			expect(colors[clampLevel(raw)], String(raw)).toBeDefined();
		}
	});
});
