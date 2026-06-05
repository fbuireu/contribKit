import { expect, test } from "@playwright/test";

test.describe("api/contributions", () => {
	test("returns a calendar for a valid user", async ({ request }) => {
		const response = await request.get("/api/contributions?user=torvalds");
		expect(response.status()).toBe(200);
		const body = await response.json();
		expect(Array.isArray(body.cells)).toBe(true);
	});

	test("returns 400 without a user", async ({ request }) => {
		const response = await request.get("/api/contributions");
		expect(response.status()).toBe(400);
	});
});
