import type { APIRoute } from 'astro';
import { fetchContributions } from '../../application/use-cases/fetch-contributions';
import { renderCalendarSvg } from '../../application/use-cases/render-calendar-svg';
import type { Failure } from '../../domain/failures/failure';
import { DEFAULT_PALETTE_KEY, paletteByKey } from '../../domain/value-objects/palette';
import { isShapeKind, type ShapeKind } from '../../domain/value-objects/shape';
import { parseUsername } from '../../domain/value-objects/username';
import { createGithubHtmlContributionsRepository } from '../../infrastructure/github/github-html-contributions-repository';
import { svgStringRenderer } from '../../infrastructure/rendering/svg-string-renderer';

export const prerender = false;

const isFailure = (value: unknown): value is Failure =>
  typeof value === 'object' && value !== null && 'kind' in value;

const statusFor = (failure: Failure): number => (failure.kind === 'NotFound' ? 404 : failure.kind === 'InvalidInput' ? 400 : 502);

const repository = createGithubHtmlContributionsRepository();
const loadContributions = fetchContributions(repository);
const renderSvg = renderCalendarSvg(svgStringRenderer);

export const GET: APIRoute = async ({ params, url }) => {
  const username = parseUsername(params.username ?? '');
  if (isFailure(username)) {
    return new Response('Invalid username', { status: statusFor(username), headers: { 'Content-Type': 'text/plain' } });
  }

  const result = await loadContributions(username, null);
  if (isFailure(result)) {
    const body = result.kind === 'NotFound' ? 'User not found or GitHub unavailable' : 'GitHub unavailable';
    return new Response(body, { status: statusFor(result), headers: { 'Content-Type': 'text/plain' } });
  }

  const paletteKey = url.searchParams.get('palette') ?? DEFAULT_PALETTE_KEY;
  const shapeParam = url.searchParams.get('shape') ?? 'rounded';
  const shape: ShapeKind = isShapeKind(shapeParam) ? shapeParam : 'rounded';
  const background = url.searchParams.get('bg') ?? 'transparent';

  const svg = renderSvg(result, { palette: paletteByKey(paletteKey), shape, background });

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
};
