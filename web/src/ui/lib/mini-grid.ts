import { mulberry32 } from './mulberry';

const COLS = 26;
const ROWS = 7;
const CELL_SIZE = 4;
const GAP = 1;
const STEP = CELL_SIZE + GAP;
const SEED = 99;

export function generateMiniGrid(palette: readonly string[]): string {
  const rand = mulberry32(SEED);
  const cells: number[] = Array.from({ length: COLS * ROWS }, (_, i) => {
    const randomValue = rand();
    const progress = Math.floor(i / ROWS) / COLS;
    const boosted = randomValue + progress * 0.3 + Math.sin(i / 8) * 0.15;
    if (boosted > 0.92) return 4;
    if (boosted > 0.78) return 3;
    if (boosted > 0.62) return 2;
    if (boosted > 0.42) return 1;
    return 0;
  });

  const svgWidth = COLS * STEP;
  const svgHeight = ROWS * STEP;
  let svg = `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">`;
  for (let columnIndex = 0; columnIndex < COLS; columnIndex++) {
    for (let rowIndex = 0; rowIndex < ROWS; rowIndex++) {
      const level = cells[columnIndex * ROWS + rowIndex];
      svg += `<rect x="${columnIndex * STEP}" y="${rowIndex * STEP}" width="${CELL_SIZE}" height="${CELL_SIZE}" rx="1" fill="${palette[level]}"/>`;
    }
  }
  return svg + '</svg>';
}
