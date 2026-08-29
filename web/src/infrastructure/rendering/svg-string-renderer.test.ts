import type { ContributionCalendar } from "@domain/entities/types";
import type { CellShape } from "@domain/value-objects/cell-shape";
import type { ContributionLevel } from "@domain/value-objects/contribution-level";
import { DEFAULT_PALETTE_KEY, paletteByKey } from "@domain/value-objects/palette";
import { describe, expect, it } from "vitest";
import { svgStringRenderer } from "./svg-string-renderer";

const calendar: ContributionCalendar = {
	username: { _tag: "Username", value: "torvalds" },
	year: null,
	days: Array.from({ length: 371 }, (_, index) => ({
		date: "2024-01-01",
		level: (index % 5) as ContributionLevel,
		count: index % 5,
	})),
	totalContributions: 100,
};

const palette = paletteByKey(DEFAULT_PALETTE_KEY);

interface RenderParams {
	shape: CellShape;
	overrides?: Record<string, unknown>;
}

const render = ({ shape, overrides = {} }: RenderParams): string =>
	svgStringRenderer({ days: calendar.days, options: { palette, shape, background: "transparent", ...overrides } });

describe("svgStringRenderer", () => {
	it("produces an <svg> root with a viewBox", () => {
		const svg = render({ shape: "square" });
		expect(svg.startsWith("<svg")).toBe(true);
		expect(svg.endsWith("</svg>")).toBe(true);
		expect(svg).toContain('viewBox="0 0');
	});

	it("renders rects for square and rounded", () => {
		expect(render({ shape: "square" })).toContain("<rect");
		expect(render({ shape: "rounded" })).toContain("<rect");
	});

	it("renders circles for circle and dot", () => {
		expect(render({ shape: "circle" })).toContain("<circle");
		expect(render({ shape: "dot" })).toContain("<circle");
	});

	it("renders polygons for hex", () => {
		expect(render({ shape: "hex" })).toContain("<polygon");
	});

	it("paints a background rect when not transparent", () => {
		expect(render({ shape: "square", overrides: { background: "#101010" } })).toContain('fill="#101010"');
	});

	it("includes labels by default and omits them when disabled", () => {
		expect(render({ shape: "square", overrides: { showLabels: true } })).toContain("<text");
		expect(render({ shape: "square", overrides: { showLabels: false } })).not.toContain("<text");
	});
});
