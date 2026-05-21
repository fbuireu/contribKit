import type { APIRoute } from 'astro';
import { z } from 'zod';
import { fetchContributions } from '../../application/use-cases/fetch-contributions';
import { parseUsername } from '../../domain/value-objects/username';
import { isYear, parseYear } from '../../domain/value-objects/year';
import { createGithubHtmlContributionsRepository } from '../../infrastructure/github/github-html-contributions-repository';
import { isFailure, messageFor, statusFor } from '../../ui/lib/failure-http';

export const prerender = false;

const querySchema = z.object({
  user: z.string().min(1),
  year: z.string().optional(),
});

const repository = createGithubHtmlContributionsRepository();
const loadContributions = fetchContributions(repository);

export const GET: APIRoute = async ({ url }) => {
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return Response.json({ error: 'Missing required parameter: user' }, { status: 400 });
  }

  const username = parseUsername(parsed.data.user);
  if (isFailure(username)) {
    return Response.json({ error: messageFor(username) }, { status: statusFor(username) });
  }

  const year = parseYear(parsed.data.year);
  if (isFailure(year)) {
    return Response.json({ error: messageFor(year) }, { status: statusFor(year) });
  }

  const result = await loadContributions(username, isYear(year) ? year : null);
  if (isFailure(result)) {
    return Response.json({ error: messageFor(result) }, { status: statusFor(result) });
  }

  return Response.json(
    {
      username: result.username,
      cells: result.days.map((d) => ({ date: d.date, level: d.level, count: d.count })),
      total: result.total,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    },
  );
};
