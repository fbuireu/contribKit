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

	test("GET /user/<name>.svg returns an SVG", async ({ request }) => {
		const response = await request.get("/user/torvalds.svg");
		expect(response.status()).toBe(200);
		expect(response.headers()["content-type"]).toContain("svg");
	});
});
