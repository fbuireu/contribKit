export type PaletteColors = readonly [string, string, string, string, string];

export interface Palette {
  readonly key: string;
  readonly name: string;
  readonly colors: PaletteColors;
}

export const PALETTES: Record<string, Palette> = {
  github:     { key: 'github',     name: 'GitHub',      colors: ['#161B22','#0E4429','#006D32','#26A641','#39D353'] },
  catppuccin: { key: 'catppuccin', name: 'Catppuccin',  colors: ['#1E1E2E','#313244','#89B4FA','#74C7EC','#CBA6F7'] },
  nord:       { key: 'nord',       name: 'Nord',        colors: ['#2E3440','#3B4252','#5E81AC','#81A1C1','#88C0D0'] },
  dracula:    { key: 'dracula',    name: 'Dracula',     colors: ['#282A36','#44475A','#6272A4','#BD93F9','#FF79C6'] },
  gruvbox:    { key: 'gruvbox',    name: 'Gruvbox',     colors: ['#282828','#3C3836','#D79921','#D65D0E','#CC241D'] },
  sunset:     { key: 'sunset',     name: 'Sunset',      colors: ['#1A1A2E','#4A1942','#C9485B','#ED8936','#FECB2F'] },
  tokyonight: { key: 'tokyonight', name: 'Tokyo Night', colors: ['#1A1B26','#24283B','#7AA2F7','#7DCFFF','#BB9AF7'] },
  onedark:    { key: 'onedark',    name: 'One Dark',    colors: ['#282C34','#3E4451','#61AFEF','#56B6C2','#C678DD'] },
  rosepine:   { key: 'rosepine',   name: 'Rosé Pine',   colors: ['#191724','#26233A','#9CCFD8','#EB6F92','#C4A7E7'] },
  solarized:  { key: 'solarized',  name: 'Solarized',   colors: ['#002B36','#073642','#268BD2','#2AA198','#859900'] },
  monokai:    { key: 'monokai',    name: 'Monokai',     colors: ['#272822','#3E3D32','#A6E22E','#E6DB74','#F92672'] },
};

export const DEFAULT_PALETTE_KEY = PALETTES.github.key;

export const paletteByKey = (key: string): Palette =>
  PALETTES[key] ?? PALETTES[DEFAULT_PALETTE_KEY];
