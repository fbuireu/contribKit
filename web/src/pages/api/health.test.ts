import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("cloudflare:workers", () => ({ env: { API_RATE_LIMITER: { limit: vi.fn() } } }));

import { GET } from "./health";

const PUBLIC_VARS = [
	"PUBLIC_GOOGLE_ANALYTICS_ID",
	"PUBLIC_BETTER_STACK_SOURCE_TOKEN",
	"PUBLIC_BETTER_STACK_INGESTING_URL",
] as const;

describe("GET /api/health", () => {
	afterEach(() => vi.unstubAllEnvs());

	it("200 ok when every var and binding is present", async () => {
		for (const key of PUBLIC_VARS) vi.stubEnv(key, "set");

		const res = GET({} as never) as Response;

		expect(res.status).toBe(200);
		const body = (await res.json()) as { status: string; env: Record<string, boolean> };
		expect(body.status).toBe("ok");
		expect(body.env.API_RATE_LIMITER).toBe(true);
	});

	it("503 misconfigured when a var is missing", async () => {
		vi.stubEnv("PUBLIC_GOOGLE_ANALYTICS_ID", "");
		vi.stubEnv("PUBLIC_BETTER_STACK_SOURCE_TOKEN", "set");
		vi.stubEnv("PUBLIC_BETTER_STACK_INGESTING_URL", "set");

		const res = GET({} as never) as Response;

		expect(res.status).toBe(503);
		const body = (await res.json()) as { status: string; env: Record<string, boolean> };
		expect(body.status).toBe("misconfigured");
		expect(body.env.PUBLIC_GOOGLE_ANALYTICS_ID).toBe(false);
	});
});
