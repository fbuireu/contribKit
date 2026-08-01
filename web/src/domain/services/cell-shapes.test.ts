import { describe, expect, it } from "vitest";
import { CELL_SHAPES, CellShape } from "../value-objects/cell-shape";
import { renderCellShape } from "./cell-shapes";
import { dotRadius } from "./svg-geometry";

const ANY_CELL_SHAPE_ELEMENT = /^<(rect|circle|polygon)/;

const base = { x: 0, y: 0, size: 10, radius: 2, fill: "#123456", level: 3 };

describe("renderCellShape", () => {
	it("renders a rect with the given radius for rounded", () => {
		expect(renderCellShape({ ...base, shape: CellShape.Rounded })).toBe(
			'<rect x="0" y="0" width="10" height="10" rx="2" fill="#123456"/>',
		);
	});

	it("renders a rect for square", () => {
		expect(renderCellShape({ ...base, shape: CellShape.Square, radius: 0 })).toContain('rx="0"');
	});

	it("renders a centered circle filling the cell for circle", () => {
		expect(renderCellShape({ ...base, shape: CellShape.Circle })).toBe('<circle cx="5" cy="5" r="5" fill="#123456"/>');
	});

	it("sizes the dot radius by contribution level", () => {
		expect(renderCellShape({ ...base, shape: CellShape.Dot })).toContain(`r="${dotRadius(base.level)}"`);
	});

	it("renders a polygon for hex", () => {
		expect(renderCellShape({ ...base, shape: CellShape.Hex })).toContain("<polygon points=");
	});

	it("appends extra attributes to the cell markup", () => {
		const svg = renderCellShape({ ...base, shape: CellShape.Square, attributes: ' data-date="2024-01-01"' });
		expect(svg).toContain('data-date="2024-01-01"');
	});

	it("renders every shape the customizer offers", () => {
		for (const shape of CELL_SHAPES) expect(renderCellShape({ ...base, shape })).toMatch(ANY_CELL_SHAPE_ELEMENT);
	});
});
