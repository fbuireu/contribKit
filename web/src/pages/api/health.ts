import { MAINTAINER_EMAIL } from "astro:env/server";
import { env } from "cloudflare:workers";
import { NOT_CACHEABLE } from "@application/http/cache-control";
import { logServerError, SERVER_ERROR_MESSAGE, SERVER_ERROR_STATUS } from "@application/http/failure-log";
import { logger } from "@infrastructure/logging/logger";
import type { APIRoute } from "astro";

export const prerender = false;

const handle: APIRoute = () => {
	const presence = {
		PUBLIC_GOOGLE_ANALYTICS_ID: Boolean(import.meta.env.PUBLIC_GOOGLE_ANALYTICS_ID),
		PUBLIC_BETTER_STACK_TRACKING_TOKEN: Boolean(import.meta.env.PUBLIC_BETTER_STACK_TRACKING_TOKEN),
		API_RATE_LIMITER: Boolean(env.API_RATE_LIMITER),
		CONTACT_RATE_LIMITER: Boolean(env.CONTACT_RATE_LIMITER),
		CONTACT_EMAIL: Boolean(env.CONTACT_EMAIL),
		MAINTAINER_EMAIL: Boolean(MAINTAINER_EMAIL),
	};

	const ok = Object.values(presence).every(Boolean);

	return Response.json(
		{ status: ok ? "ok" : "misconfigured", env: presence, timestamp: new Date().toISOString() },
		{ status: ok ? 200 : 503, headers: { "Cache-Control": NOT_CACHEABLE } },
	);
};

export const GET: APIRoute = (context) => {
	try {
		return handle(context);
	} catch (error) {
		logServerError({ logger, error, path: context.url.pathname });
		return Response.json(
			{ error: SERVER_ERROR_MESSAGE },
			{ status: SERVER_ERROR_STATUS, headers: { "Cache-Control": NOT_CACHEABLE } },
		);
	}
};
