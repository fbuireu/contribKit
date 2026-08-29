import { env } from "cloudflare:workers";
import { NOT_CACHEABLE } from "@application/http/cache-control";
import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = () => {
	const presence = {
		PUBLIC_GOOGLE_ANALYTICS_ID: Boolean(import.meta.env.PUBLIC_GOOGLE_ANALYTICS_ID),
		PUBLIC_BETTER_STACK_SOURCE_TOKEN: Boolean(import.meta.env.PUBLIC_BETTER_STACK_SOURCE_TOKEN),
		PUBLIC_BETTER_STACK_INGESTING_URL: Boolean(import.meta.env.PUBLIC_BETTER_STACK_INGESTING_URL),
		API_RATE_LIMITER: Boolean(env.API_RATE_LIMITER),
	};

	const ok = Object.values(presence).every(Boolean);

	return Response.json(
		{ status: ok ? "ok" : "misconfigured", env: presence, timestamp: new Date().toISOString() },
		{ status: ok ? 200 : 503, headers: { "Cache-Control": NOT_CACHEABLE } },
	);
};
