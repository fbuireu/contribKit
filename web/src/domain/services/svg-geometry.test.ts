import { describe, expect, it } from "vitest";
import {
	calendarDimensions,
	dotRadius,
	hexPoints,
	radiusFor,
	SVG_LABEL_WIDTH,
	SVG_PAD_X,
	SVG_WEEKS,
} from "./svg-geometry";

describe("radiusFor", () => {
	it("rounded → 2.5", () => expect(radiusFor({ shape: "rounded", size: 10 })).toBe(2.5));
	it("square → 0", () => expect(radiusFor({ shape: "square", size: 10 })).toBe(0));
	it("other shapes → size / 2", () => {
		expect(radiusFor({ shape: "circle", size: 10 })).toBe(5);
		expect(radiusFor({ shape: "dot", size: 12 })).toBe(6);
	});
});

describe("dotRadius", () => {
	it("level 0 → 1.4", () => expect(dotRadius(0)).toBe(1.4));
	it("grows with level", () => {
		expect(dotRadius(1)).toBe(2.4);
		expect(dotRadius(4)).toBe(5.4);
	});
});

describe("hexPoints", () => {
	it("returns 6 space-separated x,y points fixed to 2 decimals", () => {
		const points = hexPoints({ cx: 10, cy: 10, radius: 7 }).split(" ");
		expect(points).toHaveLength(6);
		for (const point of points) expect(point).toMatch(/^-?\d+\.\d{2},-?\d+\.\d{2}$/);
	});
});

describe("calendarDimensions", () => {
	it("computes dimensions with labels", () => {
		const dimensions = calendarDimensions({ size: 10, gap: 2, showLabels: true });
		expect(dimensions.cellWidth).toBe(12);
		expect(dimensions.labelWidth).toBe(SVG_LABEL_WIDTH);
		expect(dimensions.totalWidth).toBe(SVG_WEEKS * 12 + SVG_LABEL_WIDTH + SVG_PAD_X * 2);
	});

	it("drops label dimensions when labels are hidden", () => {
		const dimensions = calendarDimensions({ size: 10, gap: 2, showLabels: false });
		expect(dimensions.labelWidth).toBe(0);
		expect(dimensions.labelHeight).toBe(0);
	});
});
