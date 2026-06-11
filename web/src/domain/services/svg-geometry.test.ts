import { describe, expect, it } from "vitest";
import {
	calendarDimensions,
	chunkWeeks,
	dotRadius,
	hexPoints,
	monthLabelPositions,
	radiusFor,
	SVG_DAYS_PER_WEEK,
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

describe("chunkWeeks", () => {
	it("splits a full grid into SVG_WEEKS weeks of SVG_DAYS_PER_WEEK", () => {
		const cells = Array.from({ length: SVG_WEEKS * SVG_DAYS_PER_WEEK }, (_, index) => index);
		const weeks = chunkWeeks(cells);
		expect(weeks).toHaveLength(SVG_WEEKS);
		expect(weeks[0]).toEqual([0, 1, 2, 3, 4, 5, 6]);
		expect(weeks.at(-1)?.at(-1)).toBe(SVG_WEEKS * SVG_DAYS_PER_WEEK - 1);
	});

	it("leaves trailing weeks empty when there are fewer cells", () => {
		const weeks = chunkWeeks([1, 2, 3]);
		expect(weeks).toHaveLength(SVG_WEEKS);
		expect(weeks[0]).toEqual([1, 2, 3]);
		expect(weeks[1]).toEqual([]);
	});
});

describe("monthLabelPositions", () => {
	it("labels the first week of each month within the max-day window", () => {
		const weeks = [
			[{ date: "2024-01-01" }],
			[{ date: "2024-01-08" }],
			[{ date: "2024-02-05" }],
			[{ date: "2024-02-12" }],
		];
		expect(monthLabelPositions(weeks)).toEqual([
			{ weekIndex: 0, label: "Jan" },
			{ weekIndex: 2, label: "Feb" },
		]);
	});

	it("skips a month whose first visible week starts too late", () => {
		const weeks = [[{ date: "2024-01-01" }], [{ date: "2024-02-09" }]];
		expect(monthLabelPositions(weeks)).toEqual([{ weekIndex: 0, label: "Jan" }]);
	});

	it("ignores empty weeks", () => {
		expect(monthLabelPositions([[], [{ date: "2024-03-04" }]])).toEqual([{ weekIndex: 1, label: "Mar" }]);
	});
});
