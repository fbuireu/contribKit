import { fieldFor, messageFor, retryAfterHeader, statusFor } from "@application/http/failure-http";
import {
	ContributionsEndpoint,
	logContributionsFailure,
	logServerError,
	SERVER_ERROR_MESSAGE,
	SERVER_ERROR_STATUS,
} from "@application/http/failure-log";
import { isFailure } from "@domain/failures/failure";
import { parseUsername } from "@domain/value-objects/username";
import { isYear, parseYear } from "@domain/value-objects/year";
import { loggerFor } from "@infrastructure/logging/better-stack-logger";
import type { APIRoute } from "astro";
import { z } from "astro/zod";
import { loadContributions } from "../_contributions";

export const prerender = false;

const querySchema = z.object({
	user: z.string().min(1),
	year: z.string().optional(),
});

const handle: APIRoute = async ({ url, locals }) => {
	const data = querySchema.safeParse(Object.fromEntries(url.searchParams));
	if (!data.success) {
		return Response.json({ error: "Missing required parameter: user" }, { status: 400 });
	}

	const username = parseUsername(data.data.user);
	if (isFailure(username)) {
		return Response.json({ error: messageFor(username), ...fieldFor(username) }, { status: statusFor(username) });
	}

	const year = parseYear(data.data.year);
	if (isFailure(year)) {
		return Response.json({ error: messageFor(year), ...fieldFor(year) }, { status: statusFor(year) });
	}

	const result = await loadContributions({ username, year: isYear(year) ? year : null });
	if (isFailure(result)) {
		const status = statusFor(result);
		logContributionsFailure({
			logger: loggerFor(locals),
			username: username.value,
			kind: result.kind,
			reason: messageFor(result),
			status,
			endpoint: ContributionsEndpoint.Api,
		});
		return Response.json({ error: messageFor(result) }, { status, headers: retryAfterHeader(result) });
	}

	const days = result.days.map((day) => ({ date: day.date, level: day.level, count: day.count }));

	return Response.json(
		{
			username: result.username.value,
			days,
			cells: days,
			total: result.totalContributions,
		},
		{
			headers: {
				"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
			},
		},
	);
};

export const GET: APIRoute = async (context) => {
	try {
		return await handle(context);
	} catch (error) {
		logServerError({ logger: loggerFor(context.locals), error, path: context.url.pathname });
		return Response.json({ error: SERVER_ERROR_MESSAGE }, { status: SERVER_ERROR_STATUS });
	}
};
