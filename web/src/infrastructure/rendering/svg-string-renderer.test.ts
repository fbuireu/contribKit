import { type ContributionDayParams, contributionDay } from "@domain/entities/contribution-day";
import type { ContributionCalendar, ContributionDay } from "@domain/entities/types";
import { isFailure } from "@domain/failures/failure";
import { WEEKDAY_LABELS } from "@domain/value-objects/calendar-labels";
import type { CellShape } from "@domain/value-objects/cell-shape";
import { DEFAULT_PALETTE_KEY, paletteByKey } from "@domain/value-objects/palette";
import { describe, expect, it } from "vitest";
import { svgStringRenderer } from "./svg-string-renderer";

const day = (params: ContributionDayParams): ContributionDay => {
	const built = contributionDay(params);
	if (isFailure(built)) throw new Error(`fixture is not a Contribution Day: ${params.date}`);
	return built;
};

const calendar: ContributionCalendar = {
	username: { _tag: "Username", value: "torvalds" },
	year: null,
	days: Array.from({ length: 371 }, (_, index) => day({ date: "2024-01-01", level: index % 5, count: index % 5 })),
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

	it("paints a background rect when not transparent, and none when it is", () => {
		const painted = render({ shape: "square", overrides: { background: "#101010" } });

		expect(painted).toMatch(/<rect width="[\d.]+" height="[\d.]+" fill="#101010"\/>/);
		expect(render({ shape: "square" })).not.toContain('<rect width="');
	});

	it("includes labels by default and omits them when disabled", () => {
		expect(render({ shape: "square" })).toContain("<text");
		expect(render({ shape: "square", overrides: { showLabels: false } })).not.toContain("<text");
	});
});

describe("the labels of an SVG on a transparent Background", () => {
	const labelFills = (svg: string): string[] => [...svg.matchAll(/<text [^>]*fill="([^"]+)"/g)].map(([, fill]) => fill);

	it("stay light for a viewer whose scheme is dark, or whose renderer reads no stylesheet", () => {
		const svg = render({ shape: "square" });

		expect(new Set(labelFills(svg))).toEqual(new Set(["rgba(255,255,255,0.45)", "rgba(255,255,255,0.35)"]));
	});

	it("darken under a light scheme, by a rule inside the SVG that an <img> honours", () => {
		const svg = render({ shape: "square" });

		expect(svg).toContain("<style>@media (prefers-color-scheme:light){");
		expect(svg).toContain(".month{fill:rgba(0,0,0,0.55)}");
		expect(svg).toContain(".weekday{fill:rgba(0,0,0,0.45)}");
	});

	it("carry the class the rule selects, a month label and a weekday label each its own", () => {
		const svg = render({ shape: "square" });

		expect([...svg.matchAll(/<text [^>]*class="month"/g)].length).toBeGreaterThan(0);
		expect([...svg.matchAll(/<text [^>]*class="weekday"/g)]).toHaveLength(WEEKDAY_LABELS.length);
		expect([...svg.matchAll(/<text /g)]).toHaveLength(
			[...svg.matchAll(/<text [^>]*class="(?:month|weekday)"/g)].length,
		);
	});

	it("put the rule before anything is drawn, inside the root", () => {
		const svg = render({ shape: "square" });

		expect(svg.indexOf("<style>")).toBeGreaterThan(svg.indexOf("<svg"));
		expect(svg.indexOf("<style>")).toBeLessThan(svg.indexOf("<text"));
		expect([...svg.matchAll(/<style>/g)]).toHaveLength(1);
	});

	it("leave no stylesheet behind when there are no labels", () => {
		expect(render({ shape: "square", overrides: { showLabels: false } })).not.toContain("<style>");
	});
});

describe("the labels of an SVG on a painted Background", () => {
	it("follow the Background and not the viewer's scheme, since the Background is known", () => {
		const svg = render({ shape: "square", overrides: { background: "#101010" } });

		expect(svg).not.toContain("prefers-color-scheme");
		const grey = "lch(from #101010 l 0 0)";
		const channel = "calc(255 * clamp(0,(128 - r) * 1000,1))";
		const alpha = (onDark: number) => `calc(${onDark} + 0.1 * clamp(0,(r - 128) * 1000,1))`;

		expect(svg).toContain(`.month{fill:rgb(from ${grey} ${channel} ${channel} ${channel} / ${alpha(0.45)})}`);
		expect(svg).toContain(`.weekday{fill:rgb(from ${grey} ${channel} ${channel} ${channel} / ${alpha(0.35)})}`);
	});

	it("keep the light fill they always had where a renderer reads no stylesheet", () => {
		const svg = render({ shape: "square", overrides: { background: "white" } });

		expect(svg).toContain(".month{fill:rgb(from lch(from white l 0 0) ");
		expect(svg).toMatch(/<text [^>]*fill="rgba\(255,255,255,0.45\)"/);
	});
});
