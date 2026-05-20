import type { ContributionCalendar } from '../../domain/entities/contribution-calendar';
import type { SvgRenderOptions, SvgRenderer } from '../../domain/services/svg-renderer';

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
const MONTHS: readonly string[] = Array.from({ length: 12 }, (_, i) =>
  monthFormatter.format(new Date(2000, i, 1)),
);

const weekdayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
// Mon, Wed, Fri — odd rows of the 7-row grid (where row 0 = Sunday).
const DOW: readonly string[] = [1, 3, 5].map((dow) => weekdayFormatter.format(new Date(2024, 0, dow)));
const PAD_X = 12;
const PAD_Y = 12;
const LABEL_W = 28;
const LABEL_H = 18;
const DEFAULT_CELL_SIZE = 10;
const DEFAULT_CELL_GAP = 2;
const WEEKS = 53;
const DAYS_PER_WEEK = 7;

const renderRect = (x: number, y: number, size: number, radius: number, fill: string): string =>
  `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="${fill}"/>`;

const renderCircle = (cx: number, cy: number, r: number, fill: string): string =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;

const renderHex = (cx: number, cy: number, s: number, fill: string): string => {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    pts.push(`${(cx + s * Math.cos(a)).toFixed(2)},${(cy + s * Math.sin(a)).toFixed(2)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`;
};

export const svgStringRenderer: SvgRenderer = (
  calendar: ContributionCalendar,
  options: SvgRenderOptions,
): string => {
  const { palette, shape, background } = options;
  const size = options.cellSize ?? DEFAULT_CELL_SIZE;
  const gap = options.cellGap ?? DEFAULT_CELL_GAP;
  const showLabels = options.showLabels ?? true;
  const cellW = size + gap;
  const labelW = showLabels ? LABEL_W : 0;
  const labelH = showLabels ? LABEL_H : 0;
  const totalW = WEEKS * cellW + labelW + PAD_X * 2;
  const totalH = DAYS_PER_WEEK * cellW + labelH + PAD_Y * 2;
  const radius = shape === 'rounded' ? 2.5 : shape === 'square' ? 0 : size / 2;

  const weeks: typeof calendar.days[number][][] = [];
  for (let w = 0; w < WEEKS; w++) {
    weeks.push([...calendar.days.slice(w * DAYS_PER_WEEK, w * DAYS_PER_WEEK + DAYS_PER_WEEK)]);
  }

  const parts: string[] = [];
  parts.push(
    `<svg viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GitHub contribution calendar">`,
  );

  if (background !== 'transparent') {
    parts.push(`<rect width="${totalW}" height="${totalH}" fill="${background}"/>`);
  }

  if (showLabels) {
    let lastMonth = -1;
    weeks.forEach((week, w) => {
      const first = week[0];
      if (!first) return;
      const date = new Date(`${first.date}T12:00:00`);
      const m = date.getMonth();
      if (m !== lastMonth && date.getDate() <= 7) {
        parts.push(
          `<text x="${PAD_X + labelW + w * cellW}" y="${PAD_Y + 11}" fill="rgba(255,255,255,0.45)" font-size="9.5" font-family="ui-monospace,monospace" letter-spacing="0.04em">${MONTHS[m]}</text>`,
        );
        lastMonth = m;
      }
    });

    DOW.forEach((d, i) => {
      parts.push(
        `<text x="${PAD_X}" y="${PAD_Y + labelH + (i * 2 + 1) * cellW + 4}" fill="rgba(255,255,255,0.35)" font-size="9" font-family="ui-monospace,monospace">${d}</text>`,
      );
    });
  }

  parts.push(`<g transform="translate(${PAD_X + labelW},${PAD_Y + labelH})">`);

  weeks.forEach((week, w) => {
    week.forEach((day, d) => {
      const fill = palette.colors[day.level] ?? palette.colors[0];
      const x = w * cellW;
      const y = d * cellW;
      if (shape === 'dot') {
        const r = day.level === 0 ? 1.4 : 1.4 + day.level * 1.0;
        parts.push(renderCircle(x + size / 2, y + size / 2, r, fill));
      } else if (shape === 'hex') {
        parts.push(renderHex(x + size / 2, y + size / 2, size / 2, fill));
      } else if (shape === 'circle') {
        parts.push(renderCircle(x + size / 2, y + size / 2, size / 2, fill));
      } else {
        parts.push(renderRect(x, y, size, radius, fill));
      }
    });
  });

  parts.push('</g></svg>');
  return parts.join('');
};
