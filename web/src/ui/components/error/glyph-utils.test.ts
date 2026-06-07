import { describe, expect, it } from "vitest";
import { digitsToMatrix, noiseLevel } from "./glyph-utils";

describe("digitsToMatrix", () => {
	it("produces seven rows", () => {
		expect(digitsToMatrix("4")).toHaveLength(7);
	});

	it("makes a single glyph five columns wide", () => {
		for (const row of digitsToMatrix("4")) expect(row).toHaveLength(5);
	});

	it("separates each digit with a two-column gap (404 → 19 wide)", () => {
		for (const row of digitsToMatrix("404")) expect(row).toHaveLength(19);
	});

	it("rasterizes a glyph's lit pixels (top row of 0 is 01110)", () => {
		expect(digitsToMatrix("0")[0]).toEqual([0, 1, 1, 1, 0]);
	});

	it("renders unknown characters as blank columns", () => {
		for (const row of digitsToMatrix("x")) expect(row).toEqual([0, 0, 0, 0, 0]);
	});

	it("returns seven empty rows for an empty string", () => {
		const matrix = digitsToMatrix("");
		expect(matrix).toHaveLength(7);
		for (const row of matrix) expect(row).toHaveLength(0);
	});
});

describe("noiseLevel", () => {
	it("is deterministic for the same inputs", () => {
		expect(noiseLevel({ row: 1, col: 2, seed: 3 })).toBe(noiseLevel({ row: 1, col: 2, seed: 3 }));
	});

	it("only ever returns 0, 1, or 2", () => {
		for (let row = 0; row < 7; row++) {
			for (let col = 0; col < 20; col++) {
				expect([0, 1, 2]).toContain(noiseLevel({ row, col, seed: 3 }));
			}
		}
	});

	it("returns level 0 at the origin with seed 0", () => {
		expect(noiseLevel({ row: 0, col: 0, seed: 0 })).toBe(0);
	});

	it("returns mostly empty cells, matching the 0.86 threshold", () => {
		const counts = [0, 0, 0];
		for (let row = 0; row < 7; row++) {
			for (let col = 0; col < 100; col++) {
				counts[noiseLevel({ row, col, seed: 3 })]++;
			}
		}
		const total = counts[0] + counts[1] + counts[2];
		expect(counts[0] / total).toBeGreaterThan(0.7);
		expect(counts[2]).toBeLessThan(counts[0]);
	});
});
