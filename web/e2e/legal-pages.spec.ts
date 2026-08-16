import { expect, test } from "@playwright/test";

const LEGAL_PAGES = ["/terms", "/legal-notice", "/privacy"] as const;

for (const path of LEGAL_PAGES) {
	test.describe(`legal page ${path}`, () => {
		test("returns 200", async ({ page }) => {
			const response = await page.goto(path);
			expect(response?.status()).toBe(200);
		});

		test("renders a heading", async ({ page }) => {
			await page.goto(path);
			await expect(page.locator("h1")).toBeVisible();
		});

		test("stays out of the index", async ({ page }) => {
			await page.goto(path);
			await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
		});
	});
}

test.describe("privacy", () => {
	test("uses a summary card with no og:image", async ({ page }) => {
		await page.goto("/privacy");
		await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary");
		await expect(page.locator('meta[property="og:image"]')).toHaveCount(0);
	});
});
