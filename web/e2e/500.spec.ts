import { expect, test } from "@playwright/test";

test.describe("500 page", () => {
	test("the /500 route renders the error page with a 500 status", async ({ request }) => {
		const response = await request.get("/500");
		expect(response.status()).toBe(500);
		expect(await response.text()).toContain("500");
	});
});
