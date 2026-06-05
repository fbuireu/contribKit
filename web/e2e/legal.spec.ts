import { expect, test } from "@playwright/test";

const PAGES = ["/privacy", "/terms", "/legal-notice"];

for (const path of PAGES) {
	test.describe(`legal: ${path}`, () => {
		test("returns 200", async ({ page }) => {
			const response = await page.goto(path);
			expect(response?.status()).toBe(200);
		});

		test("renders a heading", async ({ page }) => {
			await page.goto(path);
			await expect(page.locator("h1")).toBeVisible();
		});
	});
}
