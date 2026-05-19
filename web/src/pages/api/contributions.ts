import type { APIRoute } from 'astro';

export const prerender = false;

const USER_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

interface Cell {
  date: string;
  level: number;
}

function parseCells(html: string): { cells: Cell[]; total: number | null } {
  const cells: Cell[] = [];
  const tdRe = /<td\b([^>]*ContributionCalendar-day[^>]*)>/g;
  const dateRe = /data-date="(\d{4}-\d{2}-\d{2})"/;
  const levelRe = /data-level="(\d)"/;
  const countRe = /data-count="(\d+)"/;
  let m: RegExpExecArray | null;
  let totalFromCells = 0;
  let hasCounts = false;
  while ((m = tdRe.exec(html)) !== null) {
    const attrs = m[1];
    const date = dateRe.exec(attrs)?.[1];
    const level = levelRe.exec(attrs)?.[1];
    const count = countRe.exec(attrs)?.[1];
    if (date && level !== undefined) {
      const c = Number.parseInt(count ?? '0', 10);
      if (c > 0) hasCounts = true;
      totalFromCells += c;
      cells.push({ date, level: Number.parseInt(level) });
    }
  }
  const total = hasCounts ? totalFromCells : null;
  return { cells, total };
}

export const GET: APIRoute = async ({ url }) => {
  const user = url.searchParams.get('user')?.trim() ?? '';

  if (!USER_RE.test(user)) {
    return Response.json({ error: 'Invalid username' }, { status: 400 });
  }

  const yearParam = url.searchParams.get('year');
  const year = yearParam ? Number.parseInt(yearParam) : null;
  const now = new Date().getFullYear();
  const validYear = year && year >= 2005 && year < now ? year : null;
  const ghUrl = validYear
    ? `https://github.com/users/${user}/contributions?from=${validYear}-01-01&to=${validYear}-12-31`
    : `https://github.com/users/${user}/contributions`;

  let res: Response;
  try {
    res = await fetch(ghUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: `https://github.com/${user}`,
      },
    });
  } catch (e) {
    return Response.json({ error: `Network error: ${e}` }, { status: 502 });
  }

  if (res.status === 404) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  const html = await res.text();

  if (!res.ok) {
    return Response.json({ error: `GitHub returned ${res.status}` }, { status: 502 });
  }

  const { cells, total } = parseCells(html);

  if (cells.length === 0) {
    return Response.json({ error: 'Could not parse contributions' }, { status: 502 });
  }

  return Response.json(
    { username: user, cells, total },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    },
  );
};
