import { expect, test } from "@playwright/test";

test.describe("privacy", () => {
	test("returns 200", async ({ page }) => {
		const response = await page.goto("/privacy");
		expect(response?.status()).toBe(200);
	});

	test("renders a heading", async ({ page }) => {
		await page.goto("/privacy");
		await expect(page.locator("h1")).toBeVisible();
	});
});
