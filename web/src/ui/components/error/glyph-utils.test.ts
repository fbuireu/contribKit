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
	it("buckets low values as empty (0)", () => {
		expect(noiseLevel(0)).toBe(0);
		expect(noiseLevel(0.8599)).toBe(0);
	});

	it("buckets mid values as a faint spark (1)", () => {
		expect(noiseLevel(0.86)).toBe(1);
		expect(noiseLevel(0.9599)).toBe(1);
	});

	it("buckets high values as a bright spark (2)", () => {
		expect(noiseLevel(0.96)).toBe(2);
		expect(noiseLevel(0.999)).toBe(2);
	});
});
