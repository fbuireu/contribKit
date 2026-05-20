import type { APIRoute } from 'astro';
import { z } from 'astro:schema';

export const prerender = false;

const querySchema = z.object({
  user: z
    .string()
    .min(1)
    .max(39)
    .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/),
  year: z
    .string()
    .optional()
    .transform((v) => (v ? Number.parseInt(v, 10) : null))
    .pipe(
      z
        .number()
        .int()
        .min(2005)
        .max(new Date().getFullYear())
        .nullable(),
    ),
});

interface Cell {
  date: string;
  level: number;
}

function parseCells(html: string): { cells: Cell[]; total: number | null } {
  const cells: Cell[] = [];
  const ids: string[] = [];

  // Pass 1: id → {date, level} from <td class="ContributionCalendar-day">
  const tdRe = /<td\b([^>]*ContributionCalendar-day[^>]*)>/g;
  const dateRe = /data-date="(\d{4}-\d{2}-\d{2})"/;
  const levelRe = /data-level="(\d)"/;
  const idRe = /\bid="([^"]+)"/;
  let m: RegExpExecArray | null;

  while ((m = tdRe.exec(html)) !== null) {
    const attrs = m[1];
    const date = dateRe.exec(attrs)?.[1];
    const level = levelRe.exec(attrs)?.[1];
    const id = idRe.exec(attrs)?.[1];
    if (date && level !== undefined) {
      cells.push({ date, level: Number.parseInt(level) });
      if (id) ids.push(id);
    }
  }

  // Pass 2: count from <tool-tip for="...">N contributions…</tool-tip>
  // "No contributions on…" does not start with a digit, so it correctly maps to 0.
  const tipRe = /<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>(\d+)/g;
  const idToCount = new Map<string, number>();
  while ((m = tipRe.exec(html)) !== null) {
    idToCount.set(m[1], Number.parseInt(m[2]));
  }

  if (idToCount.size > 0) {
    const total = ids.reduce((sum, id) => sum + (idToCount.get(id) ?? 0), 0);
    return { cells, total };
  }

  return { cells, total: null };
}

export const GET: APIRoute = async ({ url }) => {
  const parsed = querySchema.safeParse({
    user: url.searchParams.get('user')?.trim() ?? '',
    year: url.searchParams.get('year') ?? undefined,
  });

  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    const msg = field === 'user' ? 'Invalid username' : 'Invalid year';
    return Response.json({ error: msg }, { status: 400 });
  }

  const { user, year } = parsed.data;
  const now = new Date().getFullYear();
  const encodedUser = encodeURIComponent(user);
  const ghUrl = year
    ? year < now
      ? `https://github.com/users/${encodedUser}/contributions?from=${year}-01-01&to=${year}-12-31`
      : `https://github.com/users/${encodedUser}/contributions?from=${year}-01-01`
    : `https://github.com/users/${encodedUser}/contributions`;

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
        Referer: `https://github.com/${encodedUser}`,
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
