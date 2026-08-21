import type { ContributionDay } from "@domain/entities/types";
import { CellShape } from "@domain/value-objects/cell-shape";
import { describe, expect, it } from "vitest";
import { renderCalendarString, shapePreviewSVG } from "./render-svg";

const palette = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"] as const;
const days: ContributionDay[] = Array.from({ length: 53 * 7 }, () => ({ date: "2024-01-01", level: 2, count: 4 }));

describe("renderCalendarString", () => {
	it("emits data-count for known counts and omits it entirely when the count is unknown", () => {
		const unknown: ContributionDay[] = Array.from({ length: 53 * 7 }, () => ({
			date: "2024-01-01",
			level: 3,
			count: null,
		}));
		const svg = renderCalendarString({ days: unknown, palette, shape: CellShape.Square });
		expect(svg).toContain('data-date="2024-01-01"');
		expect(svg).not.toContain("data-count");
		expect(renderCalendarString({ days, palette, shape: CellShape.Square })).toContain('data-count="4"');
	});
	it("produces an <svg> with rects for square shapes", () => {
		const svg = renderCalendarString({ days, palette, shape: CellShape.Square });
		expect(svg.startsWith("<svg")).toBe(true);
		expect(svg).toContain("<rect");
	});

	it("renders circles for dot and polygons for hex", () => {
		expect(renderCalendarString({ days, palette, shape: CellShape.Dot })).toContain("<circle");
		expect(renderCalendarString({ days, palette, shape: CellShape.Hex })).toContain("<polygon");
	});

	it("includes labels when showLabels is on and omits them when off", () => {
		expect(renderCalendarString({ days, palette, showLabels: true })).toContain("<text");
		expect(renderCalendarString({ days, palette, showLabels: false })).not.toContain("<text");
	});

	it("embeds data-date and data-count on days", () => {
		const svg = renderCalendarString({ days, palette });
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
