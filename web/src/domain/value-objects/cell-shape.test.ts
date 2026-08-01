import shapes from "@shared/shapes.json" with { type: "json" };
import { describe, expect, it } from "vitest";
import { CELL_SHAPES, CellShape, DEFAULT_CELL_SHAPE, isCellShape } from "./cell-shape";

describe("shape", () => {
	it("exposes at least one shape kind", () => {
		expect(CELL_SHAPES.length).toBeGreaterThan(0);
	});

	it("DEFAULT_CELL_SHAPE is a valid shape", () => {
		expect(isCellShape(DEFAULT_CELL_SHAPE)).toBe(true);
	});

	it("isCellShape accepts every known shape", () => {
		for (const kind of CELL_SHAPES) expect(isCellShape(kind)).toBe(true);
	});

	it("isCellShape rejects unknown values", () => {
		expect(isCellShape("triangle")).toBe(false);
		expect(isCellShape("")).toBe(false);
	});

	it("drops a shared token that no CellShape implements", () => {
		const known = new Set<string>(Object.values(CellShape));
		for (const kind of CELL_SHAPES) expect(known.has(kind)).toBe(true);
		expect(CELL_SHAPES).toEqual(shapes.map((shape) => shape.key).filter((key) => known.has(key)));
	});
});
