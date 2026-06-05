import type { ContributionCalendar } from "@domain/entities/contribution-calendar";
import type { ContributionLevel } from "@domain/value-objects/contribution-level";
import { DEFAULT_PALETTE_KEY, paletteByKey } from "@domain/value-objects/palette";
import type { ShapeKind } from "@domain/value-objects/shape";
import { describe, expect, it } from "vitest";
import { svgStringRenderer } from "./svg-string-renderer";

const calendar: ContributionCalendar = {
	username: "torvalds",
	days: Array.from({ length: 371 }, (_, i) => ({
		date: "2024-01-01",
		level: (i % 5) as ContributionLevel,
		count: i % 5,
	})),
	total: 100,
};

const palette = paletteByKey(DEFAULT_PALETTE_KEY);

const render = (shape: ShapeKind, overrides = {}): string =>
	svgStringRenderer({ calendar, options: { palette, shape, background: "transparent", ...overrides } });

describe("svgStringRenderer", () => {
	it("produces an <svg> root with a viewBox", () => {
		const svg = render("square");
		expect(svg.startsWith("<svg")).toBe(true);
		expect(svg.endsWith("</svg>")).toBe(true);
		expect(svg).toContain('viewBox="0 0');
	});

	it("renders rects for square and rounded", () => {
		expect(render("square")).toContain("<rect");
		expect(render("rounded")).toContain("<rect");
	});

	it("renders circles for circle and dot", () => {
		expect(render("circle")).toContain("<circle");
		expect(render("dot")).toContain("<circle");
	});

	it("renders polygons for hex", () => {
		expect(render("hex")).toContain("<polygon");
	});

	it("paints a background rect when not transparent", () => {
		expect(render("square", { background: "#101010" })).toContain('fill="#101010"');
	});

	it("includes labels by default and omits them when disabled", () => {
		expect(render("square", { showLabels: true })).toContain("<text");
		expect(render("square", { showLabels: false })).not.toContain("<text");
	});
});
