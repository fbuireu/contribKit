import { expect, test } from "@playwright/test";

const CHECKED_KEYS = [
	"PUBLIC_GOOGLE_ANALYTICS_ID",
	"PUBLIC_BETTER_STACK_SOURCE_TOKEN",
	"PUBLIC_BETTER_STACK_INGESTING_URL",
	"API_RATE_LIMITER",
];

interface HealthBody {
	status: string;
	env: Record<string, boolean>;
	timestamp: string;
}

test.describe("api/health", () => {
	test("reports every key it claims to check, and agrees with its own status code", async ({ request }) => {
		const response = await request.get("/api/health");
		const body = (await response.json()) as HealthBody;

		expect(Object.keys(body.env).sort()).toEqual([...CHECKED_KEYS].sort());
		expect(Object.values(body.env).every((present) => typeof present === "boolean")).toBe(true);

		const everythingPresent = Object.values(body.env).every(Boolean);
		expect(body.status).toBe(everythingPresent ? "ok" : "misconfigured");
		expect(response.status()).toBe(everythingPresent ? 200 : 503);
	});

	test("is never cached, because a stored health check answers a question nobody asked", async ({ request }) => {
		const response = await request.get("/api/health");

		expect(response.headers()["cache-control"]).toBe("no-store");
	});
});
