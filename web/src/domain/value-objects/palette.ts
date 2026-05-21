import rawPalettes from '@shared/palettes.json' with { type: 'json' };

export type PaletteColors = readonly [string, string, string, string, string];

export interface Palette {
  readonly key: string;
  readonly name: string;
  readonly colors: PaletteColors;
}

export const PALETTES: Record<string, Palette> = Object.fromEntries(
  rawPalettes.map((p) => [
    p.key,
    {
      key: p.key,
      name: p.name,
      colors: [p.none, p.low, p.medium, p.high, p.veryHigh] as const,
    },
  ]),
);

export const DEFAULT_PALETTE_KEY = PALETTES.github.key;

export const paletteByKey = (key: string): Palette =>
  PALETTES[key] ?? PALETTES[DEFAULT_PALETTE_KEY];
