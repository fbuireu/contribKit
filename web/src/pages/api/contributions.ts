import { messageFor, SERVER_ERROR_STATUS, statusFor } from "@application/http/failure-http";
import { isFailure } from "@domain/failures/failure";
import { parseUsername } from "@domain/value-objects/username";
import { isYear, parseYear } from "@domain/value-objects/year";
import { getLogger } from "@infrastructure/logging/better-stack-logger";
import type { APIRoute } from "astro";
import { z } from "astro/zod";
import { loadContributions } from "../_contributions";

export const prerender = false;

const querySchema = z.object({
	user: z.string().min(1),
	year: z.string().optional(),
});

export const GET: APIRoute = async ({ url, locals }) => {
	const data = querySchema.safeParse(Object.fromEntries(url.searchParams));
	if (!data.success) {
		return Response.json({ error: "Missing required parameter: user" }, { status: 400 });
	}

	const username = parseUsername(data.data.user);
	if (isFailure(username)) {
		return Response.json({ error: messageFor(username) }, { status: statusFor(username) });
	}

	const year = parseYear(data.data.year);
	if (isFailure(year)) {
		return Response.json({ error: messageFor(year) }, { status: statusFor(year) });
	}

	const result = await loadContributions({ username, year: isYear(year) ? year : null });
	if (isFailure(result)) {
		const status = statusFor(result);
		if (status >= SERVER_ERROR_STATUS) {
			const executionContext = (locals as { cfContext?: ExecutionContext }).cfContext;
			getLogger(executionContext).error({
				message: "GitHub contributions fetch failed",
				context: {
					username: username.value,
					kind: result.kind,
					reason: messageFor(result),
					status,
					endpoint: "api",
				},
			});
		}
		return Response.json({ error: messageFor(result) }, { status });
	}

	const days = result.days.map((day) => ({ date: day.date, level: day.level, count: day.count }));

	return Response.json(
		{
			username: result.username,
			days,
			cells: days,
			total: result.total,
		},
		{
			headers: {
				"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
			},
		},
	);
};
