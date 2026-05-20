import type { ContributionCalendar } from '../../domain/entities/contribution-calendar';
import type { ContributionDay } from '../../domain/entities/contribution-day';
import { network, notFound, parse, type Failure } from '../../domain/failures/failure';
import type { ContributionsRepository } from '../../domain/repositories/contributions-repository';
import { clampLevel } from '../../domain/value-objects/contribution-level';
import type { Username } from '../../domain/value-objects/username';
import type { Year } from '../../domain/value-objects/year';

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const buildUrl = (username: string, year: Year | null): string => {
  const encoded = encodeURIComponent(username);
  if (!year) return `https://github.com/users/${encoded}/contributions`;
  const now = new Date().getFullYear();
  const base = `https://github.com/users/${encoded}/contributions?from=${year.value}-01-01`;
  return year.value < now ? `${base}&to=${year.value}-12-31` : base;
};

const TD_RE = /<td\b([^>]*ContributionCalendar-day[^>]*)>/g;
const DATE_RE = /data-date="(\d{4}-\d{2}-\d{2})"/;
const LEVEL_RE = /data-level="(\d)"/;
const ID_RE = /\bid="([^"]+)"/;
const TIP_RE = /<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>(\d+)/g;

const parseHtml = (html: string): { days: ContributionDay[]; total: number | null } => {
  const days: { date: string; level: number; id: string | null }[] = [];

  for (const match of html.matchAll(TD_RE)) {
    const attrs = match[1];
    const date = DATE_RE.exec(attrs)?.[1];
    const level = LEVEL_RE.exec(attrs)?.[1];
    const id = ID_RE.exec(attrs)?.[1] ?? null;
    if (date && level !== undefined) {
      days.push({ date, level: Number.parseInt(level, 10), id });
    }
  }

  const idToCount = new Map<string, number>();
  for (const match of html.matchAll(TIP_RE)) {
    idToCount.set(match[1], Number.parseInt(match[2], 10));
  }

  const enriched: ContributionDay[] = days.map(({ date, level, id }) => ({
    date,
    level: clampLevel(level),
    count: id !== null && idToCount.has(id) ? (idToCount.get(id) ?? 0) : null,
  }));

  const total = idToCount.size > 0 ? enriched.reduce((sum, d) => sum + (d.count ?? 0), 0) : null;
  return { days: enriched, total };
};

export const createGithubHtmlContributionsRepository = (): ContributionsRepository => ({
  async fetch(username: Username, year: Year | null): Promise<ContributionCalendar | Failure> {
    const url = buildUrl(username.value, year);

    let res: Response;
    try {
      res = await fetch(url, {
        redirect: 'follow',
        headers: {
          'User-Agent': UA,
          Accept: 'text/html, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'X-Requested-With': 'XMLHttpRequest',
          Referer: `https://github.com/${encodeURIComponent(username.value)}`,
        },
      });
    } catch (e) {
      return network(`Network error: ${(e as Error).message}`);
    }

    if (res.status === 404) return notFound(username.value);
    if (!res.ok) return network(`GitHub returned ${res.status}`, res.status);

    const html = await res.text();
    const { days, total } = parseHtml(html);
    if (days.length === 0) return parse('Could not parse contributions');

    return { username: username.value, days, total };
  },
});
