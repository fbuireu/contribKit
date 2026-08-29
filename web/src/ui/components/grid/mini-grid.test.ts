import { type ContributionDayParams, contributionDay } from "@domain/entities/contribution-day";
import type { ContributionDay } from "@domain/entities/types";
import { isFailure } from "@domain/failures/failure";
import { colorOrThrow } from "@domain/value-objects/color";
import type { PaletteColors } from "@domain/value-objects/palette";
import { describe, expect, it } from "vitest";
import { generateMiniGrid } from "./mini-grid";

const day = (params: ContributionDayParams): ContributionDay => {
	const built = contributionDay(params);
	if (isFailure(built)) throw new Error(`fixture is not a Contribution Day: ${params.date}`);
	return built;
};

const CELL_RECT = /<rect/g;

const palette = ["#000000", "#111111", "#222222", "#333333", "#444444"].map(colorOrThrow) as unknown as PaletteColors;

describe("generateMiniGrid", () => {
	it("returns an svg element", () => {
		const svg = generateMiniGrid({ palette });
		expect(svg.startsWith("<svg")).toBe(true);
		expect(svg.endsWith("</svg>")).toBe(true);
	});

	it("is deterministic in demo mode", () => {
		expect(generateMiniGrid({ palette })).toBe(generateMiniGrid({ palette }));
	});

	it("renders a 26×7 demo grid by default", () => {
		const rects = generateMiniGrid({ palette }).match(CELL_RECT) ?? [];
		expect(rects).toHaveLength(26 * 7);
	});

	it("renders a responsive 53×7 grid from live days", () => {
		const liveDays: ContributionDay[] = Array.from({ length: 53 * 7 }, () =>
			day({ date: "2024-01-01", level: 2, count: 4 }),
		);
		const svg = generateMiniGrid({ palette, liveDays });
		expect(svg).toContain('width="100%"');
		expect(svg.match(CELL_RECT) ?? []).toHaveLength(53 * 7);
	});
});
