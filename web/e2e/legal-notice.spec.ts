import { expect, test } from "@playwright/test";

test.describe("legal notice", () => {
	test("returns 200", async ({ page }) => {
		const response = await page.goto("/legal-notice");
		expect(response?.status()).toBe(200);
	});

	test("renders a heading", async ({ page }) => {
		await page.goto("/legal-notice");
		await expect(page.locator("h1")).toBeVisible();
	});
});
