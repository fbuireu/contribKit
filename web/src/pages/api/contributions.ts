import type { APIRoute } from 'astro';
import { fetchContributions } from '../../application/use-cases/fetch-contributions';
import type { Failure } from '../../domain/failures/failure';
import { parseUsername } from '../../domain/value-objects/username';
import { parseYear, isYear } from '../../domain/value-objects/year';
import { createGithubHtmlContributionsRepository } from '../../infrastructure/github/github-html-contributions-repository';

export const prerender = false;

const isFailure = (value: unknown): value is Failure =>
  typeof value === 'object' && value !== null && 'kind' in value;

const statusFor = (failure: Failure): number => {
  switch (failure.kind) {
    case 'NotFound':
      return 404;
    case 'InvalidInput':
      return 400;
    case 'Network':
      return 502;
    case 'Parse':
      return 502;
  }
};

const messageFor = (failure: Failure): string => {
  switch (failure.kind) {
    case 'NotFound':
      return 'User not found';
    case 'InvalidInput':
      return failure.message;
    case 'Network':
      return failure.message;
    case 'Parse':
      return failure.message;
  }
};

const repository = createGithubHtmlContributionsRepository();
const loadContributions = fetchContributions(repository);

export const GET: APIRoute = async ({ url }) => {
  const username = parseUsername(url.searchParams.get('user') ?? '');
  if (isFailure(username)) {
    return Response.json({ error: messageFor(username) }, { status: statusFor(username) });
  }

  const yearParam = url.searchParams.get('year');
  const year = parseYear(yearParam);
  if (isFailure(year)) {
    return Response.json({ error: messageFor(year) }, { status: statusFor(year) });
  }

  const yearValue = isYear(year) ? year : null;

  const result = await loadContributions(username, yearValue);
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
