import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { binding, logServerError } = vi.hoisted(() => ({
	binding: { explodes: false },
	logServerError: vi.fn(),
}));

vi.mock("astro:env/server", () => ({ MAINTAINER_EMAIL: "maintainer@example.com" }));
vi.mock("cloudflare:workers", () => ({
	env: {
		API_RATE_LIMITER: { limit: vi.fn() },
		CONTACT_RATE_LIMITER: { limit: vi.fn() },
		get CONTACT_EMAIL() {
			if (binding.explodes) throw new Error("the binding lookup exploded");
			return { send: vi.fn() };
		},
	},
}));
vi.mock("@application/http/failure-log", async (importOriginal) => ({
	...(await importOriginal<typeof import("@application/http/failure-log")>()),
	logServerError,
}));

import { GET } from "../api/health";

const PUBLIC_VARS = ["PUBLIC_GOOGLE_ANALYTICS_ID", "PUBLIC_BETTER_STACK_TRACKING_TOKEN"] as const;

describe("GET /api/health", () => {
	beforeEach(() => {
		binding.explodes = false;
		logServerError.mockClear();
	});

	afterEach(() => vi.unstubAllEnvs());

	it("200 ok when every var and binding is present", async () => {
		for (const key of PUBLIC_VARS) vi.stubEnv(key, "set");

		const res = GET({} as never) as Response;

		expect(res.status).toBe(200);
		const body = (await res.json()) as { status: string; env: Record<string, boolean> };
		expect(body.status).toBe("ok");
		expect(body.env.API_RATE_LIMITER).toBe(true);
		expect(body.env.CONTACT_RATE_LIMITER).toBe(true);
		expect(body.env.CONTACT_EMAIL).toBe(true);
		expect(body.env.MAINTAINER_EMAIL).toBe(true);
	});

	it("503 misconfigured when a var is missing", async () => {
		vi.stubEnv("PUBLIC_GOOGLE_ANALYTICS_ID", "");
		vi.stubEnv("PUBLIC_BETTER_STACK_TRACKING_TOKEN", "set");

		const res = GET({} as never) as Response;

		expect(res.status).toBe(503);
		const body = (await res.json()) as { status: string; env: Record<string, boolean> };
		expect(body.status).toBe("misconfigured");
		expect(body.env.PUBLIC_GOOGLE_ANALYTICS_ID).toBe(false);
	});

	it("answers 500 through the boundary, reports it and never repeats the thrown message", async () => {
		for (const key of PUBLIC_VARS) vi.stubEnv(key, "set");
		binding.explodes = true;

		const res = GET({ url: new URL("https://contribkit.app/api/health") } as never) as Response;

		expect(res.status).toBe(500);
		expect(res.headers.get("Content-Type")).toContain("application/json");
		expect(res.headers.get("Cache-Control")).toBe("no-store");
		expect(await res.json()).toEqual({ error: "Something went wrong. Please try again." });
		expect(logServerError).toHaveBeenCalledOnce();
		expect(logServerError).toHaveBeenCalledWith(
			expect.objectContaining({
				path: "/api/health",
				error: expect.objectContaining({ message: "the binding lookup exploded" }),
			}),
		);
	});

	it("is never stored, whichever answer it gives", async () => {
		for (const key of PUBLIC_VARS) vi.stubEnv(key, "set");
		const healthy = GET({} as never) as Response;

		vi.stubEnv("PUBLIC_GOOGLE_ANALYTICS_ID", "");
		const misconfigured = GET({} as never) as Response;

		expect(healthy.headers.get("Cache-Control")).toBe("no-store");
		expect(misconfigured.headers.get("Cache-Control")).toBe("no-store");
	});
});
