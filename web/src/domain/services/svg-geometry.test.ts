import { describe, expect, it } from "vitest";
import { WEEKS_PER_YEAR } from "./dates";
import {
	calendarDimensions,
	cellPoint,
	dotRadius,
	gridOrigin,
	hexPoints,
	monthLabelPoint,
	monthLabelPositions,
	radiusFor,
	SVG_LABEL_WIDTH,
	SVG_MONTH_LABEL_BASELINE,
	SVG_PAD_X,
	SVG_PAD_Y,
	weekdayLabelPoint,
} from "./svg-geometry";

const TWO_DECIMAL_POINT_PAIR = /^-?\d+\.\d{2},-?\d+\.\d{2}$/;

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
		for (const point of points) expect(point).toMatch(TWO_DECIMAL_POINT_PAIR);
	});
});

describe("calendarDimensions", () => {
	it("computes dimensions with labels", () => {
		const dimensions = calendarDimensions({ size: 10, gap: 2, showLabels: true });
		expect(dimensions.cellWidth).toBe(12);
		expect(dimensions.labelWidth).toBe(SVG_LABEL_WIDTH);
		expect(dimensions.totalWidth).toBe(WEEKS_PER_YEAR * 12 + SVG_LABEL_WIDTH + SVG_PAD_X * 2);
	});

	it("drops label dimensions when labels are hidden", () => {
		const dimensions = calendarDimensions({ size: 10, gap: 2, showLabels: false });
		expect(dimensions.labelWidth).toBe(0);
		expect(dimensions.labelHeight).toBe(0);
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

describe("the layout points both renderers share", () => {
	const dimensions = calendarDimensions({ size: 10, gap: 2, showLabels: true });

	it("places a month label to the right of the weekday gutter", () => {
		const point = monthLabelPoint({ weekIndex: 0, cellWidth: dimensions.cellWidth, labelWidth: dimensions.labelWidth });

		expect(point.x).toBe(SVG_PAD_X + dimensions.labelWidth);
		expect(point.y).toBe(SVG_PAD_Y + SVG_MONTH_LABEL_BASELINE);
	});

	it("steps a month label one cell width per week", () => {
		const first = monthLabelPoint({ weekIndex: 0, cellWidth: dimensions.cellWidth, labelWidth: dimensions.labelWidth });
		const second = monthLabelPoint({
			weekIndex: 1,
			cellWidth: dimensions.cellWidth,
			labelWidth: dimensions.labelWidth,
		});

		expect(second.x - first.x).toBe(dimensions.cellWidth);
	});

	it("draws the three weekday labels on alternate rows", () => {
		const rows = [0, 1, 2].map(
			(index) => weekdayLabelPoint({ index, cellWidth: dimensions.cellWidth, labelHeight: dimensions.labelHeight }).y,
		);

		expect(rows[1] - rows[0]).toBe(dimensions.cellWidth * 2);
		expect(rows[2] - rows[1]).toBe(dimensions.cellWidth * 2);
	});

	it("puts the grid origin past both gutters", () => {
		const origin = gridOrigin({ labelWidth: dimensions.labelWidth, labelHeight: dimensions.labelHeight });

		expect(origin).toEqual({
			x: SVG_PAD_X + dimensions.labelWidth,
			y: SVG_PAD_Y + dimensions.labelHeight,
		});
	});

	it("lays cells out week by column and day by row", () => {
		expect(cellPoint({ weekIndex: 2, dayIndex: 3, cellWidth: 12 })).toEqual({ x: 24, y: 36 });
	});

	it("starts the grid at its own origin, not at the page origin", () => {
		expect(cellPoint({ weekIndex: 0, dayIndex: 0, cellWidth: 12 })).toEqual({ x: 0, y: 0 });
	});
});
