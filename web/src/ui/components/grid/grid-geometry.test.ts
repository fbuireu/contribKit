import { SVG_DEFAULT_CELL_GAP, SVG_DEFAULT_CELL_SIZE } from "@domain/services/svg-geometry";
import { describe, expect, it } from "vitest";
import { CUSTOMIZER_GRID_GEOMETRY, EXPORT_GRID_GEOMETRY, HERO_GRID_GEOMETRY } from "./grid-geometry";

describe("grid geometries", () => {
	it("derives the export geometry from the canonical svg cell geometry", () => {
		expect(EXPORT_GRID_GEOMETRY).toEqual({ size: SVG_DEFAULT_CELL_SIZE, gap: SVG_DEFAULT_CELL_GAP });
	});

	it("defines a positive size and gap in every geometry", () => {
		for (const geometry of [HERO_GRID_GEOMETRY, CUSTOMIZER_GRID_GEOMETRY, EXPORT_GRID_GEOMETRY]) {
			expect(geometry.size).toBeGreaterThan(0);
			expect(geometry.gap).toBeGreaterThan(0);
		}
	});
});
