import { messageFor, SERVER_ERROR_STATUS, statusFor } from "@application/http/failure-http";
import { renderCalendarSvg } from "@application/use-cases/render-calendar-svg";
import { isFailure } from "@domain/failures/failure";
import { type CellShape, DEFAULT_CELL_SHAPE, isCellShape } from "@domain/value-objects/cell-shape";
import { DEFAULT_BACKGROUND_COLOR, DEFAULT_PALETTE_KEY, paletteByKey } from "@domain/value-objects/palette";
import { parseUsername } from "@domain/value-objects/username";
import { getLogger } from "@infrastructure/logging/better-stack-logger";
import { svgStringRenderer } from "@infrastructure/rendering/svg-string-renderer";
import type { APIRoute } from "astro";
import { z } from "astro/zod";
import { loadContributions } from "../_contributions";

export const prerender = false;

const BACKGROUND_REGEX = /^(transparent|#[0-9a-fA-F]{3,8}|[a-zA-Z]{1,30})$/;

const querySchema = z.object({
	palette: z.string().catch(DEFAULT_PALETTE_KEY),
	shape: z.string().catch(DEFAULT_CELL_SHAPE),
	background: z.string().regex(BACKGROUND_REGEX).catch(DEFAULT_BACKGROUND_COLOR),
});

const renderSvg = renderCalendarSvg(svgStringRenderer);

export const GET: APIRoute = async ({ params, url, locals }) => {
	const username = parseUsername(params.username ?? "");
	if (isFailure(username)) {
		return new Response(messageFor(username), {
			status: statusFor(username),
			headers: { "Content-Type": "text/plain" },
		});
	}

	const calendar = await loadContributions({ username, year: null });
	if (isFailure(calendar)) {
		const status = statusFor(calendar);
		if (status >= SERVER_ERROR_STATUS) {
			const executionContext = (locals as { cfContext?: ExecutionContext }).cfContext;
			getLogger(executionContext).error({
				message: "GitHub contributions fetch failed",
				context: {
					username: username.value,
					kind: calendar.kind,
					reason: messageFor(calendar),
					status,
					endpoint: "svg",
				},
			});
		}
		return new Response(messageFor(calendar), {
			status,
			headers: { "Content-Type": "text/plain" },
		});
	}

	const {
		palette: paletteKey,
		shape: shapeParam,
		background,
	} = querySchema.parse(Object.fromEntries(url.searchParams));
	const shape: CellShape = isCellShape(shapeParam) ? shapeParam : DEFAULT_CELL_SHAPE;
	const svg = renderSvg({ calendar, options: { palette: paletteByKey(paletteKey), shape, background } });

	return new Response(svg, {
		headers: {
			"Content-Type": "image/svg+xml",
			"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
		},
	});
};
