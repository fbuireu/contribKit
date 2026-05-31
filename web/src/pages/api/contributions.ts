import { fetchContributions } from "@application/use-cases/fetch-contributions";
import { parseUsername } from "@domain/value-objects/username";
import { isYear, parseYear } from "@domain/value-objects/year";
import { createGithubHtmlContributionsRepository } from "@infrastructure/github/create-github-html-contributions-repository";
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

export const GET: APIRoute = async ({ url }) => {
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

	const result = await loadContributions(username, isYear(year) ? year : null);
	if (isFailure(result)) {
		return Response.json({ error: messageFor(result) }, { status: statusFor(result) });
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
