import { fetchContributions } from "@application/use-cases/fetch-contributions";
import { parseUsername } from "@domain/value-objects/username";
import { isYear, parseYear } from "@domain/value-objects/year";
import { createGithubHtmlContributionsRepository } from "@infrastructure/github/create-github-html-contributions-repository";
import { getLogger } from "@infrastructure/logging/better-stack-logger";
import { isFailure, messageFor, statusFor } from "@ui/lib/failure-http";
import type { APIRoute } from "astro";
import { z } from "astro/zod";

export const prerender = false;

const querySchema = z.object({
	user: z.string().min(1),
	year: z.string().optional(),
});

const repository = createGithubHtmlContributionsRepository();
const loadContributions = fetchContributions(repository);

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
		if (status >= 500) {
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

	return Response.json(
		{
			username: result.username,
			cells: result.days.map((day) => ({ date: day.date, level: day.level, count: day.count })),
			total: result.total,
		},
		{
			headers: {
				"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
			},
		},
	);
};
