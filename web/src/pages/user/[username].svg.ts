import { messageFor, retryAfterHeader, statusFor } from "@application/http/failure-http";
import {
	ContributionsEndpoint,
	logContributionsFailure,
	logServerError,
	SERVER_ERROR_MESSAGE,
	SERVER_ERROR_STATUS,
} from "@application/http/failure-log";
import { isFailure } from "@domain/failures/failure";
import { buildRollingGrid } from "@domain/services/calendar-grid";
import { type CellShape, DEFAULT_CELL_SHAPE, isCellShape } from "@domain/value-objects/cell-shape";
import { DEFAULT_EMBED_QUERY, EMBED_BACKGROUND_PATTERN, EmbedParam } from "@domain/value-objects/embed";
import { paletteByKey } from "@domain/value-objects/palette";
import { parseUsername } from "@domain/value-objects/username";
import { loggerFor } from "@infrastructure/logging/better-stack-logger";
import { svgStringRenderer } from "@infrastructure/rendering/svg-string-renderer";
import type { APIRoute } from "astro";
import { z } from "astro/zod";
import { loadContributions } from "../_contributions";

export const prerender = false;

const querySchema = z.object({
	[EmbedParam.Palette]: z.string().catch(DEFAULT_EMBED_QUERY.palette),
	[EmbedParam.Shape]: z.string().catch(DEFAULT_EMBED_QUERY.shape),
	[EmbedParam.Background]: z.string().regex(EMBED_BACKGROUND_PATTERN).catch(DEFAULT_EMBED_QUERY.background),
});

const handle: APIRoute = async ({ params, url, locals }) => {
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
		logContributionsFailure({
			logger: loggerFor(locals),
			username: username.value,
			kind: calendar.kind,
			reason: messageFor(calendar),
			status,
			endpoint: ContributionsEndpoint.Svg,
		});
		return new Response(messageFor(calendar), {
			status,
			headers: { "Content-Type": "text/plain", ...retryAfterHeader(calendar) },
		});
	}

	const {
		palette: paletteKey,
		shape: shapeParam,
		background,
	} = querySchema.parse(Object.fromEntries(url.searchParams));
	const shape: CellShape = isCellShape(shapeParam) ? shapeParam : DEFAULT_CELL_SHAPE;
	const days = buildRollingGrid({ days: calendar.days });
	const svg = svgStringRenderer({ days, options: { palette: paletteByKey(paletteKey), shape, background } });

	return new Response(svg, {
		headers: {
			"Content-Type": "image/svg+xml",
			"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
		},
	});
};

export const GET: APIRoute = async (context) => {
	try {
		return await handle(context);
	} catch (error) {
		logServerError({ logger: loggerFor(context.locals), error, path: context.url.pathname });
		return new Response(SERVER_ERROR_MESSAGE, {
			status: SERVER_ERROR_STATUS,
			headers: { "Content-Type": "text/plain" },
		});
	}
};
