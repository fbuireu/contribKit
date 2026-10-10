import { CACHEABLE_ANSWER, NOT_CACHEABLE } from "@application/http/cache-control";
import { errorBodyFor, reasonFor, retryAfterHeader, statusFor } from "@application/http/failure-http";
import {
	ContributionsEndpoint,
	logContributionsFailure,
	logServerError,
	SERVER_ERROR_MESSAGE,
	SERVER_ERROR_STATUS,
} from "@application/http/failure-log";
import { FailureField, invalidInput, isFailure } from "@domain/failures/failure";
import { parseUsername } from "@domain/value-objects/username";
import { isYear, parseYear } from "@domain/value-objects/year";
import { logger } from "@infrastructure/logging/logger";
import type { APIRoute } from "astro";
import { z } from "astro/zod";
import { loadContributions } from "../_contributions";

export const prerender = false;

const contributionCalendarQuerySchema = z.object({
	user: z.string().min(1),
	year: z.string().optional(),
});

const MISSING_USER = invalidInput({ field: FailureField.Username, message: "Missing required parameter: user" });

const handle: APIRoute = async ({ url }) => {
	const query: unknown = Object.fromEntries(url.searchParams);
	if (!contributionCalendarQuerySchema.validate(query)) {
		return Response.json(errorBodyFor(MISSING_USER), {
			status: statusFor(MISSING_USER),
			headers: { "Cache-Control": NOT_CACHEABLE },
		});
	}

	const username = parseUsername(query.user);
	if (isFailure(username)) {
		return Response.json(errorBodyFor(username), {
			status: statusFor(username),
			headers: { "Cache-Control": NOT_CACHEABLE },
		});
	}

	const year = parseYear({ requested: query.year, thisYear: new Date().getFullYear() });
	if (isFailure(year)) {
		return Response.json(errorBodyFor(year), {
			status: statusFor(year),
			headers: { "Cache-Control": NOT_CACHEABLE },
		});
	}

	const result = await loadContributions({ username, year: isYear(year) ? year : null });
	if (isFailure(result)) {
		const status = statusFor(result);
		logContributionsFailure({
			logger,
			username: username.value,
			kind: result.kind,
			reason: reasonFor(result),
			status,
			endpoint: ContributionsEndpoint.Api,
		});
		return Response.json(errorBodyFor(result), {
			status,
			headers: { "Cache-Control": NOT_CACHEABLE, ...retryAfterHeader(result) },
		});
	}

	const days = result.days.map((day) => ({ date: day.date, level: day.level, count: day.count }));

	return Response.json(
		{
			username: result.username.value,
			days,
			total: result.totalContributions,
		},
		{
			headers: {
				"Cache-Control": CACHEABLE_ANSWER,
			},
		},
	);
};

export const GET: APIRoute = async (context) => {
	try {
		return await handle(context);
	} catch (error) {
		logServerError({ logger, error, path: context.url.pathname });
		return Response.json(
			{ error: SERVER_ERROR_MESSAGE },
			{ status: SERVER_ERROR_STATUS, headers: { "Cache-Control": NOT_CACHEABLE } },
		);
	}
};
