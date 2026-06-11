import { describe, expect, it, vi } from "vitest";

const { env } = vi.hoisted(() => ({
	env: {} as { API_RATE_LIMITER?: { limit: (args: { key: string }) => Promise<{ success: boolean }> } },
}));

vi.mock("cloudflare:workers", () => ({ env }));
vi.mock("astro:middleware", () => ({ defineMiddleware: (fn: unknown) => fn }));

import { onRequest } from "./middleware";

interface RunParams {
	path: string;
	next: () => Promise<Response>;
	ip?: string;
}

const run = ({ path, next, ip = "1.2.3.4" }: RunParams): Promise<Response> =>
	(onRequest as unknown as (ctx: unknown, next: () => Promise<Response>) => Promise<Response>)(
		{
			request: new Request(`https://contribkit.app${path}`, { headers: { "CF-Connecting-IP": ip } }),
			url: new URL(`https://contribkit.app${path}`),
		},
		next,
	);

const ok = () => Promise.resolve(new Response("ok"));

describe("security headers", () => {
	it("are added to every response", async () => {
		env.API_RATE_LIMITER = undefined;
		const response = await run({ path: "/", next: ok });
		expect(response.headers.get("X-Frame-Options")).toBe("DENY");
		expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
		expect(response.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
		expect(response.headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
	});
});

describe("api rate limiting", () => {
	it("does not rate-limit non-/api paths", async () => {
		const limit = vi.fn();
		env.API_RATE_LIMITER = { limit };
		await run({ path: "/", next: ok });
		expect(limit).not.toHaveBeenCalled();
	});

	it("returns 429 when the limit is exceeded", async () => {
		env.API_RATE_LIMITER = { limit: () => Promise.resolve({ success: false }) };
		const next = vi.fn(ok);
		const response = await run({ path: "/api/contributions", next });
		expect(response.status).toBe(429);
		expect(response.headers.get("Retry-After")).toBe("60");
		expect(await response.json()).toEqual({ error: "Too many requests" });
		expect(next).not.toHaveBeenCalled();
	});

	it("allows requests under the limit, keyed by the client IP", async () => {
		const limit = vi.fn(() => Promise.resolve({ success: true }));
		env.API_RATE_LIMITER = { limit };
		const response = await run({ path: "/api/health", next: ok, ip: "9.9.9.9" });
		expect(limit).toHaveBeenCalledWith({ key: "9.9.9.9" });
		expect(response.status).toBe(200);
		expect(response.headers.get("X-Frame-Options")).toBe("DENY");
	});

	it("skips rate limiting when the binding is absent", async () => {
		env.API_RATE_LIMITER = undefined;
		const next = vi.fn(ok);
		const response = await run({ path: "/api/contributions", next });
		expect(next).toHaveBeenCalledOnce();
		expect(response.status).toBe(200);
	});
});
