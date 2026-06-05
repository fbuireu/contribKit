import { expect, test } from "@playwright/test";

test.describe("404 page", () => {
	test("unknown paths render the 404 page", async ({ page }) => {
		const response = await page.goto("/this-does-not-exist-xyz");
		expect(response?.status()).toBe(404);
		await expect(page.locator("main#main-content")).toContainText("404");
	});
});
