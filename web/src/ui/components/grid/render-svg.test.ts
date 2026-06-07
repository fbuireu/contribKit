import { describe, expect, it } from "vitest";
import type { Cell } from "./calendar-utils";
import { renderCalendarString, shapePreviewSVG } from "./render-svg";

const palette = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
const cells: Cell[] = Array.from({ length: 53 * 7 }, () => ({ date: "2024-01-01", level: 2, count: 4 }));

describe("renderCalendarString", () => {
	it("produces an <svg> with rects for square shapes", () => {
		const svg = renderCalendarString({ cells, palette, shape: "square" });
		expect(svg.startsWith("<svg")).toBe(true);
		expect(svg).toContain("<rect");
	});

	it("renders circles for dot and polygons for hex", () => {
		expect(renderCalendarString({ cells, palette, shape: "dot" })).toContain("<circle");
		expect(renderCalendarString({ cells, palette, shape: "hex" })).toContain("<polygon");
	});

	it("includes labels when showLabels is on and omits them when off", () => {
		expect(renderCalendarString({ cells, palette, showLabels: true })).toContain("<text");
		expect(renderCalendarString({ cells, palette, showLabels: false })).not.toContain("<text");
	});

	it("embeds data-date and data-count on cells", () => {
		const svg = renderCalendarString({ cells, palette });
		expect(svg).toContain('data-date="2024-01-01"');
		expect(svg).toContain("data-count=");
	});
});

describe("shapePreviewSVG", () => {
	it("renders the right primitive per shape", () => {
		expect(shapePreviewSVG("dot")).toContain("<circle");
		expect(shapePreviewSVG("circle")).toContain("<circle");
		expect(shapePreviewSVG("hex")).toContain("<polygon");
		expect(shapePreviewSVG("square")).toContain("<rect");
	});
});
