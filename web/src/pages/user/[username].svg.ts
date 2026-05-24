import type { APIRoute } from "astro";
import { z } from "astro/zod";
import { fetchContributions } from "../../application/use-cases/fetch-contributions";
import { renderCalendarSvg } from "../../application/use-cases/render-calendar-svg";
import { DEFAULT_PALETTE_KEY, paletteByKey } from "../../domain/value-objects/palette";
import { isShapeKind, type ShapeKind } from "../../domain/value-objects/shape";
import { parseUsername } from "../../domain/value-objects/username";
import { createGithubHtmlContributionsRepository } from "../../infrastructure/github/github-html-contributions-repository";
import { svgStringRenderer } from "../../infrastructure/rendering/svg-string-renderer";
import { isFailure, messageFor, statusFor } from "../../ui/lib/failure-http";

export const prerender = false;

const BACKGROUND_REGEX = /^(transparent|#[0-9a-fA-F]{3,8}|[a-zA-Z]{1,30})$/;

const querySchema = z.object({
	palette: z.string().catch(DEFAULT_PALETTE_KEY),
	shape: z.string().catch("rounded"),
	bg: z.string().regex(BACKGROUND_REGEX).catch("transparent"),
});

const repository = createGithubHtmlContributionsRepository();
const loadContributions = fetchContributions(repository);
const renderSvg = renderCalendarSvg(svgStringRenderer);

export const GET: APIRoute = async ({ params, url }) => {
	const username = parseUsername(params.username ?? "");
	if (isFailure(username)) {
		return new Response(messageFor(username), {
			status: statusFor(username),
			headers: { "Content-Type": "text/plain" },
		});
	}

	const result = await loadContributions(username, null);
	if (isFailure(result)) {
		const body = result.kind === "NotFound" ? "User not found or GitHub unavailable" : "GitHub unavailable";
		return new Response(body, { status: statusFor(result), headers: { "Content-Type": "text/plain" } });
	}

	const {
		palette: paletteKey,
		shape: shapeParam,
		bg: background,
	} = querySchema.parse(Object.fromEntries(url.searchParams));
	const shape: ShapeKind = isShapeKind(shapeParam) ? shapeParam : "rounded";

	const svg = renderSvg(result, { palette: paletteByKey(paletteKey), shape, background });

	return new Response(svg, {
		headers: {
			"Content-Type": "image/svg+xml",
			"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
		},
	});
};
