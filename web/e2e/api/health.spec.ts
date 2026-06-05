import { expect, test } from "@playwright/test";

test.describe("api/health", () => {
	test("responds with a status", async ({ request }) => {
		const response = await request.get("/api/health");
		const body = await response.json();
		expect(body).toHaveProperty("status");
	});
});
