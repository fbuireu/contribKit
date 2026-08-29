import palettes from "@shared/palettes.json" with { type: "json" };
import { type Color, colorOrThrow } from "./color";

export type PaletteColors = readonly [Color, Color, Color, Color, Color];

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
			colors: [
				colorOrThrow(palette.none),
				colorOrThrow(palette.low),
				colorOrThrow(palette.medium),
				colorOrThrow(palette.high),
				colorOrThrow(palette.veryHigh),
			] as const,
		},
	]),
);

export const DEFAULT_PALETTE_KEY = PALETTES.github.key;
export const DEFAULT_BACKGROUND_COLOR = "transparent";

export const paletteByKey = (key: string): Palette => PALETTES[key] ?? PALETTES[DEFAULT_PALETTE_KEY];
