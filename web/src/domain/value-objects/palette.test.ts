import { describe, expect, it } from "vitest";
import { DEFAULT_PALETTE_KEY, PALETTES, paletteByKey } from "./palette";

describe("palette", () => {
	it("includes the github palette", () => {
		expect(PALETTES.github).toBeDefined();
	});

	it("every palette has exactly 5 colors", () => {
		for (const palette of Object.values(PALETTES)) expect(palette.colors).toHaveLength(5);
	});

	it("paletteByKey returns the palette for a known key", () => {
		expect(paletteByKey(DEFAULT_PALETTE_KEY).key).toBe(DEFAULT_PALETTE_KEY);
	});

	it("paletteByKey falls back to the default for an unknown key", () => {
		expect(paletteByKey("does-not-exist").key).toBe(DEFAULT_PALETTE_KEY);
	});
});
