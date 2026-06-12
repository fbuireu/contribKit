import { SVG_DEFAULT_CELL_GAP, SVG_DEFAULT_CELL_SIZE } from "@domain/services/svg-geometry";
import { describe, expect, it } from "vitest";
import { CUSTOMIZE_GRID_PRESET, EXPORT_GRID_PRESET, HERO_GRID_PRESET } from "./grid-presets";

describe("grid presets", () => {
	it("derives the export preset from the canonical svg cell geometry", () => {
		expect(EXPORT_GRID_PRESET).toEqual({ size: SVG_DEFAULT_CELL_SIZE, gap: SVG_DEFAULT_CELL_GAP });
	});

	it("defines a positive size and gap in every preset", () => {
		for (const preset of [HERO_GRID_PRESET, CUSTOMIZE_GRID_PRESET, EXPORT_GRID_PRESET]) {
			expect(preset.size).toBeGreaterThan(0);
			expect(preset.gap).toBeGreaterThan(0);
		}
	});
});
