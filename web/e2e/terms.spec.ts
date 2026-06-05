import { expect, test } from "@playwright/test";

test.describe("terms", () => {
	test("returns 200", async ({ page }) => {
		const response = await page.goto("/terms");
		expect(response?.status()).toBe(200);
	});

	test("renders a heading", async ({ page }) => {
		await page.goto("/terms");
		await expect(page.locator("h1")).toBeVisible();
	});
});
