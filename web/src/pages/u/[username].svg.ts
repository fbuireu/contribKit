import type { APIRoute, GetStaticPaths } from 'astro';

export const prerender = false;

// ─── Palettes ────────────────────────────────────────────────────────────────

const PALETTES: Record<string, string[]> = {
  github:     ['#161B22','#0E4429','#006D32','#26A641','#39D353'],
  catppuccin: ['#1E1E2E','#313244','#89B4FA','#74C7EC','#CBA6F7'],
  nord:       ['#2E3440','#3B4252','#5E81AC','#81A1C1','#88C0D0'],
  dracula:    ['#282A36','#44475A','#6272A4','#BD93F9','#FF79C6'],
  gruvbox:    ['#282828','#3C3836','#D79921','#D65D0E','#CC241D'],
  sunset:     ['#1A1A2E','#4A1942','#C9485B','#ED8936','#FECB2F'],
  tokyonight: ['#1A1B26','#24283B','#7AA2F7','#7DCFFF','#BB9AF7'],
  onedark:    ['#282C34','#3E4451','#61AFEF','#56B6C2','#C678DD'],
  rosepine:   ['#191724','#26233A','#9CCFD8','#EB6F92','#C4A7E7'],
  solarized:  ['#002B36','#073642','#268BD2','#2AA198','#859900'],
  monokai:    ['#272822','#3E3D32','#A6E22E','#E6DB74','#F92672'],
};

// ─── GitHub fetch + parse ─────────────────────────────────────────────────────

interface Cell { date: string; level: number }

async function fetchCells(user: string): Promise<Cell[] | null> {
  let res: Response;
  try {
    res = await fetch(`https://github.com/users/${user}/contributions`, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: `https://github.com/${user}`,
      },
    });
  } catch { return null; }

  if (!res.ok) return null;

  const html = await res.text();
  const cells: Cell[] = [];
  const tdRe = /<td\b([^>]*ContributionCalendar-day[^>]*)>/g;
  const dateRe = /data-date="(\d{4}-\d{2}-\d{2})"/;
  const levelRe = /data-level="(\d)"/;
  let m: RegExpExecArray | null;
  while ((m = tdRe.exec(html)) !== null) {
    const date = dateRe.exec(m[1])?.[1];
    const level = levelRe.exec(m[1])?.[1];
    if (date && level !== undefined) cells.push({ date, level: Number.parseInt(level) });
  }
  return cells.length > 0 ? cells : null;
}

// ─── SVG renderer ─────────────────────────────────────────────────────────────

function renderSVG(cells: Cell[], palette: string[], shape: string, bg: string): string {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DOW = ['Mon','Wed','Fri'];
  const size = 10, gap = 2, cellW = size + gap;
  const labelW = 28, labelH = 18, padX = 12, padY = 12;
  const totalW = 53 * cellW + labelW + padX * 2;
  const totalH = 7 * cellW + labelH + padY * 2;
  const radius = shape === 'rounded' ? 2.5 : shape === 'square' ? 0 : size / 2;

  const weeks: Cell[][] = [];
  for (let w = 0; w < 53; w++) weeks.push(cells.slice(w * 7, w * 7 + 7));

  const monthLabels: { w: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, w) => {
    if (!week[0]) return;
    const m = new Date(week[0].date + 'T12:00:00').getMonth();
    if (m !== lastMonth && new Date(week[0].date + 'T12:00:00').getDate() <= 7) {
      monthLabels.push({ w, label: MONTHS[m] });
      lastMonth = m;
    }
  });

  const p: string[] = [];
  p.push(`<svg viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GitHub contribution calendar">`);

  if (bg !== 'transparent') {
    p.push(`<rect width="${totalW}" height="${totalH}" fill="${bg}"/>`);
  }

  monthLabels.forEach(({ w, label }) => {
    p.push(`<text x="${padX + labelW + w * cellW}" y="${padY + 11}" fill="rgba(255,255,255,0.45)" font-size="9.5" font-family="ui-monospace,monospace" letter-spacing="0.04em">${label}</text>`);
  });
  DOW.forEach((d, i) => {
    p.push(`<text x="${padX}" y="${padY + labelH + (i * 2 + 1) * cellW + 4}" fill="rgba(255,255,255,0.35)" font-size="9" font-family="ui-monospace,monospace">${d}</text>`);
  });

  p.push(`<g transform="translate(${padX + labelW},${padY + labelH})">`);
  weeks.forEach((week, w) => {
    week.forEach((cell, d) => {
      const lvl = Math.min(4, cell.level);
      const fill = palette[lvl] ?? palette[0];
      const x = w * cellW, y = d * cellW;
      if (shape === 'dot') {
        const r = lvl === 0 ? 1.4 : 1.4 + lvl * 1.0;
        p.push(`<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${r}" fill="${fill}"/>`);
      } else if (shape === 'hex') {
        const s = size / 2, cx = x + s, cy = y + s;
        const pts = Array.from({ length: 6 }, (_, i) => {
          const a = (Math.PI / 3) * i + Math.PI / 6;
          return `${(cx + s * Math.cos(a)).toFixed(2)},${(cy + s * Math.sin(a)).toFixed(2)}`;
        }).join(' ');
        p.push(`<polygon points="${pts}" fill="${fill}"/>`);
      } else if (shape === 'circle') {
        p.push(`<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}" fill="${fill}"/>`);
      } else {
        p.push(`<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="${fill}"/>`);
      }
    });
  });
  p.push('</g></svg>');
  return p.join('');
}

// ─── Route ────────────────────────────────────────────────────────────────────

const USER_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

export const GET: APIRoute = async ({ params, url }) => {
  const username = params.username ?? '';

  if (!USER_RE.test(username)) {
    return new Response('Invalid username', { status: 400, headers: { 'Content-Type': 'text/plain' } });
  }

  const paletteKey = url.searchParams.get('palette') ?? 'github';
  const shape = url.searchParams.get('shape') ?? 'rounded';
  const bg = url.searchParams.get('bg') ?? 'transparent';
  const palette = PALETTES[paletteKey] ?? PALETTES.github;

  const cells = await fetchCells(username);

  if (!cells) {
    return new Response('User not found or GitHub unavailable', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const svg = renderSVG(cells, palette, shape, bg);

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
};
