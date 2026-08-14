import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";
import { EMBED_ROUTE } from "@domain/value-objects/embed";

const SECURITY_HEADERS: Record<string, string> = {
	"X-Frame-Options": "DENY",
	"X-Content-Type-Options": "nosniff",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
	"Cross-Origin-Opener-Policy": "same-origin",
	"Cross-Origin-Resource-Policy": "same-origin",
	"Cross-Origin-Embedder-Policy": "unsafe-none",
	"Content-Security-Policy": [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://cdn.betterstack.com",
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"font-src 'self' https://fonts.gstatic.com",
		"img-src 'self' data:",
		"connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://cdn.betterstack.com",
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"form-action 'self'",
	].join("; "),
};

const AGENT_GUIDE_ROUTE = "/CLAUDE";

interface WithSecurityHeadersParams {
	response: Response;
	pathname: string;
}

const withSecurityHeaders = ({ response, pathname }: WithSecurityHeadersParams): Response => {
	const secured = new Response(response.body, response);
	for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
		secured.headers.set(key, value);
	}
	if (EMBED_ROUTE.test(pathname)) {
		secured.headers.set("Cross-Origin-Resource-Policy", "cross-origin");
	}
	return secured;
};

export const onRequest = defineMiddleware(async (context, next) => {
	const { request, url } = context;

	if (url.pathname === AGENT_GUIDE_ROUTE) {
		return withSecurityHeaders({
			pathname: url.pathname,
			response: new Response(null, { status: 404 }),
		});
	}

	if (url.pathname.startsWith("/api/")) {
		const rateLimiter = env.API_RATE_LIMITER;

		if (rateLimiter) {
			const key = request.headers.get("CF-Connecting-IP") ?? "unknown";
			const { success } = await rateLimiter.limit({ key });
			if (!success) {
				return withSecurityHeaders({
					pathname: url.pathname,
					response: new Response(JSON.stringify({ error: "Too many requests" }), {
						status: 429,
						headers: {
							"Content-Type": "application/json",
							"Retry-After": "60",
						},
					}),
				});
			}
		}
	}

	return withSecurityHeaders({ response: await next(), pathname: url.pathname });
});
