import { expect, test } from "@playwright/test";

test.describe("api", () => {
	test("GET /api/health responds with a status", async ({ request }) => {
		const response = await request.get("/api/health");
		const body = await response.json();
		expect(body).toHaveProperty("status");
	});

	test("GET /api/contributions returns a calendar", async ({ request }) => {
		const response = await request.get("/api/contributions?user=torvalds");
		expect(response.status()).toBe(200);
		const body = await response.json();
		expect(Array.isArray(body.cells)).toBe(true);
	});

	test("GET /api/contributions without a user returns 400", async ({ request }) => {
		const response = await request.get("/api/contributions");
		expect(response.status()).toBe(400);
	});
});
