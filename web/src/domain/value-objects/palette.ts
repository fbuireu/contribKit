import palettes from "@shared/palettes.json" with { type: "json" };

export type PaletteColors = readonly [string, string, string, string, string];

export interface Palette {
	readonly key: string;
	readonly name: string;
	readonly colors: PaletteColors;
}

export const PALETTES: Record<string, Palette> = Object.fromEntries(
	palettes.map((palette) => [
		palette.key,
		{
			key: palette.key,
			name: palette.name,
			colors: [palette.none, palette.low, palette.medium, palette.high, palette.veryHigh] as const,
		},
	]),
);

export const DEFAULT_PALETTE_KEY = PALETTES.github.key;
export const DEFAULT_BACKGROUND_COLOR = " transparent";

export const paletteByKey = (key: string): Palette => PALETTES[key] ?? PALETTES[DEFAULT_PALETTE_KEY];
